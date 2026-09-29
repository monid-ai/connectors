import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
    type Bundle,
    getPath,
    type Json,
    type OwnedResource,
    type ProvisionSeed,
    type ResolvedLookupKeys,
    type ResourceEffects,
    type ResourceLookupKeys,
    type ResourceQuery,
    type ResourceType,
} from "@shared/core";
import type { IResourceStore } from "@monid/connector-engine";
import { OUTPUT_DIR } from "../lib.ts";

/**
 * The DEFAULT local resource store (design D47) — Deno KV at
 * `.output/local.db`. This is the OSS host loop's persistence: what the
 * hosted platform keeps in Postgres (owned rows, release tombstones),
 * the local loop keeps in one gitignored KV file, so `engine:run`
 * provisions SURVIVE the process and later runs serve a real ownership
 * window ("provision a number, then place a call from it" works across
 * two invocations).
 *
 * SCRIPTS-ONLY by design: the engine stays persistence-free (it takes a
 * ResourceReader port); this adaptor is the CLI's implementation of the
 * wider IResourceStore host port.
 *
 * Layout:
 *   ["resources", <resourceId>, <externalId>]        → OwnedResource
 *   ["index",     <resourceId>, <keyName>, <value>]  → { externalId }
 *   ["released",  <resourceId>, <externalId>]        → { releasedAt }
 *
 * Release DELETES the owned row (it leaves the ownership window — the
 * uniform 404 follows naturally) and leaves a tombstone for audit.
 *
 * INDEX ROWS (design D48) are the local answer to "a resource has more
 * than one id": the def declares NAMED paths into the data snapshot
 * (`keys: { e164: "$.phoneNumber" }`), and every resolved value becomes
 * a pointer back to the primary `externalId`. Lookups therefore accept
 * either handle and return the SAME canonical row — the E.164 a Saperly
 * webhook carries resolves exactly like the uuid a user pastes.
 *
 * The keyName rides IN THE KEY rather than the value on purpose: an
 * index dump says WHICH declared key matched, a key can be listed or
 * retired on its own, and a def that drops a key simply stops writing
 * it. Resolution scans the resource's index prefix (a local store holds
 * tens of rows, not millions — correctness over a second index).
 *
 * Index rows are derived, never authored: they are rewritten from `data`
 * on every provision AND every refresh, inside the same atomic commit as
 * the row, so a stale pointer cannot outlive the value it described.
 */

/** What the store needs to know about a resource DEF to stamp a row: the
 *  generic type and the declared lookup paths. Supplied by the caller
 *  (which holds the compiled bundle) — the store never loads one. */
export interface ResourceDefFacts {
    type?: ResourceType;
    keys?: ResourceLookupKeys;
}
export type ResourceDefLookup = (
    resourceId: string,
) => ResourceDefFacts | undefined;

export interface KvResourceStoreOptions {
    path?: string;
    /** Resolves a resource id → its compiled `type` + `keys`. Absent (or
     *  returning undefined) means the store persists exactly what the
     *  caller handed it — the posture tests and fixture rows rely on. */
    defs?: ResourceDefLookup;
}

export class KvResourceStore implements IResourceStore {
    private constructor(
        private readonly kv: Deno.Kv,
        private readonly defs?: ResourceDefLookup,
    ) {}

    static async open(
        options: string | KvResourceStoreOptions = {},
    ): Promise<KvResourceStore> {
        const opts = typeof options === "string" ? { path: options } : options;
        const dbPath = opts.path ?? join(OUTPUT_DIR, "local.db");
        await ensureDir(join(dbPath, ".."));
        return new KvResourceStore(await Deno.openKv(dbPath), opts.defs);
    }

    /** Stamp the def-derived facts onto a row: the generic `type`, the
     *  `identifier` floor (externalId — a row always shows SOMETHING),
     *  and the resolved lookup keys. With no def lookup the caller's own
     *  values stand. */
    private stamp(resource: OwnedResource): OwnedResource {
        const facts = this.defs?.(resource.resource);
        const keys = facts?.keys === undefined
            ? resource.keys
            : resolveLookupKeys(facts.keys, resource.data);
        return {
            ...resource,
            type: resource.type ?? facts?.type,
            identifier: resource.identifier ?? resource.externalId,
            ...(keys !== undefined && Object.keys(keys).length > 0
                ? { keys }
                : {}),
        };
    }

    /** Every index key this row should have, given its resolved keys. */
    private indexKeys(resource: OwnedResource): Deno.KvKey[] {
        return Object.entries(resource.keys ?? {}).map((
            [name, value],
        ) => ["index", resource.resource, name, value]);
    }

    /**
     * Refuse to point one key at two resources.
     *
     * A lookup key is an ADDRESS, so a value that already names a
     * different row must not be silently repointed — that is how an
     * index starts answering confidently with the wrong resource. Two
     * live numbers cannot share an E.164, so a conflict means the data
     * is wrong (a stale row, a bad seed) and the operator needs to hear
     * it rather than inherit a quietly broken index.
     *
     * Re-provisioning the SAME externalId is not a conflict: that is a
     * resurrect, and its own keys are its to reclaim.
     */
    private async assertNoKeyConflict(row: OwnedResource): Promise<void> {
        for (const [name, value] of Object.entries(row.keys ?? {})) {
            const existing = await this.kv.get<{ externalId: string }>(
                ["index", row.resource, name, value],
            );
            if (
                existing.value !== null &&
                existing.value.externalId !== row.externalId
            ) {
                throw new Error(
                    `lookup key ${name}="${value}" already resolves to ` +
                        `${row.resource} "${existing.value.externalId}" — ` +
                        `refusing to repoint it at "${row.externalId}"`,
                );
            }
        }
    }

    async provision(resource: OwnedResource): Promise<void> {
        const row = this.stamp(resource);
        await this.assertNoKeyConflict(row);
        // ONE atomic transition: row lands, any stale tombstone drops,
        // and every index pointer appears together (a re-provision
        // resurrects) — an interleaved release can never leave both
        // absent, nor an index pointing at a row that is gone.
        let tx = this.kv.atomic()
            .set(["resources", row.resource, row.externalId], row)
            .delete(["released", row.resource, row.externalId]);
        for (const key of this.indexKeys(row)) {
            tx = tx.set(key, { externalId: row.externalId });
        }
        const result = await tx.commit();
        if (!result.ok) {
            throw new Error(
                `provision of ${row.resource} ` +
                    `"${row.externalId}" lost a commit race — retry`,
            );
        }
    }

    async refresh(id: string, handle: string, data: Json): Promise<void> {
        const externalId = await this.resolveExternalId(id, handle);
        const entry = await this.kv.get<OwnedResource>(
            ["resources", id, externalId],
        );
        if (entry.value === null) {
            throw new Error(
                `cannot refresh ${id} "${handle}" — not owned`,
            );
        }
        // the patch REPLACES data, so the index is re-derived from it:
        // a refresh that changes (or clears) a key's source field must
        // not leave the old pointer resolving
        const next = this.stamp({
            ...entry.value,
            data,
            // drop the previous resolution so `stamp` re-derives from
            // the new data rather than carrying a stale value forward
            keys: undefined,
            syncedAt: new Date().toISOString(),
        });
        // versionstamp check: a concurrent release must WIN — never
        // resurrect a released row with a stale patch
        let tx = this.kv.atomic()
            .check(entry)
            .set(["resources", id, externalId], next);
        for (const key of this.indexKeys(entry.value)) tx = tx.delete(key);
        for (const key of this.indexKeys(next)) {
            tx = tx.set(key, { externalId });
        }
        const result = await tx.commit();
        if (!result.ok) {
            throw new Error(
                `refresh of ${id} "${handle}" lost a race with a ` +
                    `concurrent transition — re-read and retry`,
            );
        }
    }

    async release(id: string, handle: string): Promise<void> {
        const externalId = await this.resolveExternalId(id, handle);
        // read first so the row's OWN index keys come down with it —
        // a pointer must never outlive the resource it names
        const existing = await this.kv.get<OwnedResource>(
            ["resources", id, externalId],
        );
        let tx = this.kv.atomic()
            .delete(["resources", id, externalId])
            .set(["released", id, externalId], {
                releasedAt: new Date().toISOString(),
            });
        if (existing.value !== null) {
            for (const key of this.indexKeys(existing.value)) {
                tx = tx.delete(key);
            }
        }
        const result = await tx.commit();
        if (!result.ok) {
            throw new Error(
                `release of ${id} "${handle}" lost a commit race — retry`,
            );
        }
    }

    /**
     * Turn ANY handle into the primary externalId (design D48): the
     * handle itself when it names a live row, else whatever the
     * resource's index says it points at, else the handle unchanged (an
     * unknown id must stay unknown — callers turn that into the uniform
     * 404, never into a different resource).
     */
    private async resolveExternalId(
        id: string,
        handle: string,
    ): Promise<string> {
        const direct = await this.kv.get<OwnedResource>(
            ["resources", id, handle],
        );
        if (direct.value !== null) return handle;
        for await (
            const entry of this.kv.list<{ externalId: string }>({
                prefix: ["index", id],
            })
        ) {
            if (entry.key[3] === handle) return entry.value.externalId;
        }
        return handle;
    }

    async get(
        id: string,
        handle: string,
    ): Promise<OwnedResource | undefined> {
        const externalId = await this.resolveExternalId(id, handle);
        const entry = await this.kv.get<OwnedResource>(
            ["resources", id, externalId],
        );
        return entry.value ?? undefined;
    }

    async list(): Promise<OwnedResource[]> {
        const rows: OwnedResource[] = [];
        for await (
            const entry of this.kv.list<OwnedResource>({
                prefix: ["resources"],
            })
        ) {
            rows.push(entry.value);
        }
        return rows;
    }

    /**
     * Re-stamp every row from the CURRENT defs and rebuild its index
     * (design D48).
     *
     * Lookup keys are declared on the def, so a def that gains a key
     * leaves already-persisted rows unindexed — they answer to their
     * externalId and nothing else, silently. This is the repair: rows
     * are never rewritten by a def edit on their own, and re-provisioning
     * a live resource to pick up an index would mean buying it twice.
     *
     * Derived data only: `data` is untouched, so this cannot lose
     * anything the vendor told us.
     */
    async reindex(): Promise<{ rows: number; keys: number }> {
        let keys = 0;
        const rows = await this.list();
        for (const row of rows) {
            const next = this.stamp({ ...row, keys: undefined });
            let tx = this.kv.atomic()
                .set(["resources", next.resource, next.externalId], next);
            for (const key of this.indexKeys(row)) tx = tx.delete(key);
            for (const key of this.indexKeys(next)) {
                tx = tx.set(key, { externalId: next.externalId });
                keys++;
            }
            await tx.commit();
        }
        return { rows: rows.length, keys };
    }

    /** Release tombstones — audit only, never part of the window. */
    async released(): Promise<
        { resource: string; externalId: string; releasedAt: string }[]
    > {
        const rows: {
            resource: string;
            externalId: string;
            releasedAt: string;
        }[] = [];
        for await (
            const entry of this.kv.list<{ releasedAt: string }>({
                prefix: ["released"],
            })
        ) {
            rows.push({
                resource: String(entry.key[1]),
                externalId: String(entry.key[2]),
                releasedAt: entry.value.releasedAt,
            });
        }
        return rows;
    }

    /** LOCAL-ONLY removal: drops the row and its pointers WITHOUT a
     *  tombstone and without touching the vendor. The `resources forget`
     *  escape hatch — desyncs you from upstream by construction. */
    async forget(id: string, handle: string): Promise<boolean> {
        const externalId = await this.resolveExternalId(id, handle);
        const existing = await this.kv.get<OwnedResource>(
            ["resources", id, externalId],
        );
        if (existing.value === null) return false;
        let tx = this.kv.atomic().delete(["resources", id, externalId]);
        for (const key of this.indexKeys(existing.value)) tx = tx.delete(key);
        await tx.commit();
        return true;
    }

    /** The ResourceReader port — what the engine's ownership window sees. */
    async owned(query: ResourceQuery): Promise<OwnedResource[]> {
        if (query.externalId !== undefined) {
            // the handle may be the primary id OR any indexed lookup
            // key: both answer with the same canonical row
            const row = await this.get(query.resource, query.externalId);
            return row === undefined ? [] : [row];
        }
        const rows: OwnedResource[] = [];
        for await (
            const entry of this.kv.list<OwnedResource>({
                prefix: ["resources", query.resource],
            })
        ) {
            rows.push(entry.value);
        }
        return rows;
    }

    close(): void {
        this.kv.close();
    }
}

/** The def facts a compiled bundle already knows — the ONE place a
 *  script turns `catalog.json` into the store's stamping rules. */
export function defsFromBundle(bundle: Bundle): ResourceDefLookup {
    return (resourceId) => {
        const doc = (bundle.resources ?? {})[resourceId];
        if (doc === undefined) return undefined;
        return { type: doc.type, keys: doc.keys };
    };
}

/**
 * Resolve a def's declared lookup paths against a data snapshot. A path
 * that reads nothing, or reads a non-string, is simply ABSENT — a
 * degraded provision (no phoneNumber yet) is addressable by its
 * externalId until a refresh fills the field in, which is strictly
 * better than indexing "undefined".
 */
export function resolveLookupKeys(
    paths: ResourceLookupKeys,
    data: Json,
): ResolvedLookupKeys {
    const resolved: ResolvedLookupKeys = {};
    for (const [name, path] of Object.entries(paths)) {
        const value = getPath(data, path);
        if (typeof value === "string" && value.length > 0) {
            resolved[name] = value;
        }
    }
    return resolved;
}

// ---------------------------------------------------------------------------
// the host ordering, shared by every script loop (engine:run, webhook)
// ---------------------------------------------------------------------------

/** The seed ADMISSION arm of `EngineCtx.admit`: persist ensure's seeds
 *  BEFORE the run executes (v1 ordering — a mid-run crash never orphans
 *  an upstream resource). */
export function admitInto(
    store: IResourceStore,
    log: (line: string) => void = (line) => console.error(line),
): (seeds: ProvisionSeed[]) => Promise<void> {
    return async (seeds) => {
        for (const seed of seeds) {
            await store.provision(rowFromSeed(seed));
            log(
                `ensure provisioned ${seed.resource} ` +
                    `"${seed.identifier ?? seed.externalId}" — persisted`,
            );
        }
    };
}

/** A provision seed → the row to persist. `identifier` is carried, NOT
 *  dropped (design D48): the seed's whole point is that the vendor's
 *  functional id and the handle a human recognises are different
 *  strings, and a store that keeps only the first cannot show the
 *  second. `type`/`keys` are stamped by the store from the def. */
function rowFromSeed(seed: ProvisionSeed): OwnedResource {
    return {
        resource: seed.resource,
        externalId: seed.externalId,
        identifier: seed.identifier ?? seed.externalId,
        data: seed.data,
    };
}

/** Settle EFFECTS → the store: the success run's persistence work-order
 *  (provisions land, releases leave the window; refresh/reconcile marks
 *  are logged — a host loop acts on them). */
export async function persistEffects(
    store: IResourceStore,
    effects: ResourceEffects | undefined,
    log: (line: string) => void = (line) => console.error(line),
): Promise<void> {
    if (!effects) return;
    for (const seed of effects.provisions ?? []) {
        await store.provision(rowFromSeed(seed));
        log(
            `provisioned ${seed.resource} ` +
                `"${seed.identifier ?? seed.externalId}"` +
                // the ADDRESS, always, beside the display handle: the
                // two differ for exactly the resources that need an
                // index, and the id is what every other command wants
                (seed.identifier !== undefined &&
                        seed.identifier !== seed.externalId
                    ? ` (id ${seed.externalId})`
                    : "") +
                ` — persisted` +
                (seed.observedUsage !== undefined
                    ? ` (observed usage: ${JSON.stringify(seed.observedUsage)})`
                    : ""),
        );
    }
    for (const target of effects.releases ?? []) {
        await store.release(target.resource, target.externalId);
        log(
            `released ${target.resource} "${target.externalId}" — left ` +
                `the ownership window`,
        );
    }
    for (const target of effects.refreshes ?? []) {
        log(
            `refresh marked for ${target.resource} "${target.externalId}"`,
        );
    }
    for (const target of effects.reconciles ?? []) {
        log(
            `usage reconcile marked for ${target.resource} ` +
                `"${target.externalId}"`,
        );
    }
}
