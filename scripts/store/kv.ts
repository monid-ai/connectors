import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type {
    Json,
    OwnedResource,
    ProvisionSeed,
    ResourceEffects,
    ResourceQuery,
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
 *   ["resources", <resourceId>, <externalId>] → OwnedResource
 *   ["released",  <resourceId>, <externalId>] → { releasedAt }
 * Release DELETES the owned row (it leaves the ownership window — the
 * uniform 404 follows naturally) and leaves a tombstone for audit.
 */
export class KvResourceStore implements IResourceStore {
    private constructor(private readonly kv: Deno.Kv) {}

    static async open(path?: string): Promise<KvResourceStore> {
        const dbPath = path ?? join(OUTPUT_DIR, "local.db");
        await ensureDir(join(dbPath, ".."));
        return new KvResourceStore(await Deno.openKv(dbPath));
    }

    async provision(resource: OwnedResource): Promise<void> {
        // ONE atomic transition: row lands and any stale tombstone drops
        // together (a re-provision resurrects) — an interleaved release
        // can never leave both absent
        const result = await this.kv.atomic()
            .set(
                ["resources", resource.resource, resource.externalId],
                resource,
            )
            .delete(["released", resource.resource, resource.externalId])
            .commit();
        if (!result.ok) {
            throw new Error(
                `provision of ${resource.resource} ` +
                    `"${resource.externalId}" lost a commit race — retry`,
            );
        }
    }

    async refresh(id: string, externalId: string, data: Json): Promise<void> {
        const entry = await this.kv.get<OwnedResource>(
            ["resources", id, externalId],
        );
        if (entry.value === null) {
            throw new Error(
                `cannot refresh ${id} "${externalId}" — not owned`,
            );
        }
        // versionstamp check: a concurrent release must WIN — never
        // resurrect a released row with a stale patch
        const result = await this.kv.atomic()
            .check(entry)
            .set(["resources", id, externalId], {
                ...entry.value,
                data,
                syncedAt: new Date().toISOString(),
            })
            .commit();
        if (!result.ok) {
            throw new Error(
                `refresh of ${id} "${externalId}" lost a race with a ` +
                    `concurrent transition — re-read and retry`,
            );
        }
    }

    async release(id: string, externalId: string): Promise<void> {
        const result = await this.kv.atomic()
            .delete(["resources", id, externalId])
            .set(["released", id, externalId], {
                releasedAt: new Date().toISOString(),
            })
            .commit();
        if (!result.ok) {
            throw new Error(
                `release of ${id} "${externalId}" lost a commit race — retry`,
            );
        }
    }

    async get(
        id: string,
        externalId: string,
    ): Promise<OwnedResource | undefined> {
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

    /** The ResourceReader port — what the engine's ownership window sees. */
    async owned(query: ResourceQuery): Promise<OwnedResource[]> {
        if (query.externalId !== undefined) {
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
            await store.provision({
                resource: seed.resource,
                externalId: seed.externalId,
                data: seed.data,
            });
            log(
                `ensure provisioned ${seed.resource} ` +
                    `"${seed.identifier ?? seed.externalId}" — persisted`,
            );
        }
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
        await store.provision({
            resource: seed.resource,
            externalId: seed.externalId,
            data: seed.data,
        });
        log(
            `provisioned ${seed.resource} ` +
                `"${seed.identifier ?? seed.externalId}" — persisted` +
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
