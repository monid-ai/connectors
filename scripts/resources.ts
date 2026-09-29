/**
 * deno task resources — what this environment OWNS (design D48/D49).
 *
 * `catalog` browses DEFINITIONS (what could exist, from the compiled
 * bundle); this browses INSTANCES (what does exist, from the local
 * store). Two different lifetimes, two different sources of truth, so
 * two commands — but deliberately the SAME shape, filters and flags, so
 * there is nothing new to learn:
 *
 *   catalog   resources --provider saperly      ← the defs
 *   resources list      --provider saperly      ← the rows
 *
 * Until this existed, the only way to see the local store was to open
 * Deno KV by hand: `KvResourceStore.list()` had no caller anywhere in
 * the repo, and a provisioned resource was effectively invisible between
 * the log line that created it and the next command that used its id.
 */
import { Command } from "@cliffy/command";
import type { OwnedResource } from "@shared/core";
import { compileToOutput } from "./lib.ts";
import { defsFromBundle, KvResourceStore } from "./store/kv.ts";
import { countLine, emit, fields, mark, table } from "./output.ts";

/** Open the store with the compiled defs bound, so rows written or
 *  re-derived here carry the same type/keys the run loop would stamp. */
async function openStore(): Promise<KvResourceStore> {
    const { bundle } = await compileToOutput();
    return await KvResourceStore.open({ defs: defsFromBundle(bundle) });
}

/** The doc's `type` for a row that predates the field (rows are stamped
 *  at write time; an old row is readable, not rewritten). */
function typeOf(row: OwnedResource): string {
    return row.type ?? "—";
}

function providerOf(row: OwnedResource): string {
    return row.resource.split("/")[0] ?? row.resource;
}

/**
 * The best HUMAN handle for a row, in descending order of authority:
 * the stored `identifier` when it actually says something the externalId
 * does not; else the first resolved lookup key (a row written before
 * `identifier` existed still has its E.164 indexed, and showing the uuid
 * when we hold the phone number helps nobody); else the externalId.
 * Display logic only — never addressing.
 */
function displayName(row: OwnedResource): string {
    if (row.identifier !== undefined && row.identifier !== row.externalId) {
        return row.identifier;
    }
    const firstKey = Object.values(row.keys ?? {})[0];
    return firstKey ?? row.externalId;
}

/** Every filter composes (AND) — the `catalog endpoints --provider x
 *  --category y` rule, applied to instances. */
function matches(
    row: OwnedResource,
    filter: { provider?: string; type?: string; resource?: string },
): boolean {
    if (filter.provider !== undefined && providerOf(row) !== filter.provider) {
        return false;
    }
    if (filter.type !== undefined && row.type !== filter.type) return false;
    if (filter.resource !== undefined && row.resource !== filter.resource) {
        return false;
    }
    return true;
}

await new Command()
    .name("resources")
    .description("Inspect the resources this environment owns.")
    .action(function () {
        this.showHelp();
    })
    .command("list", "List owned resources.")
    .option("--provider <name:string>", "Only resources of this provider.")
    .option(
        "--type <type:string>",
        "Only this generic kind (e.g. phone_number) — spans providers.",
    )
    .option(
        "--resource <id:string>",
        "Only this resource def (e.g. saperly/phone-number).",
    )
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const store = await openStore();
        const rows = (await store.list())
            .filter((row) => matches(row, options))
            .sort((a, b) =>
                a.resource.localeCompare(b.resource) ||
                a.externalId.localeCompare(b.externalId)
            );
        store.close();
        emit(rows, () => {
            if (rows.length === 0) {
                console.log(
                    mark.muted(
                        "no owned resources" +
                            (options.provider || options.type ||
                                    options.resource
                                ? " match those filters"
                                : " in this environment"),
                    ),
                );
                return;
            }
            console.log(table(
                ["PROVIDER", "TYPE", "IDENTIFIER", "EXTERNAL ID", "SYNCED"],
                rows.map((row) => [
                    providerOf(row),
                    typeOf(row),
                    displayName(row),
                    row.externalId,
                    row.syncedAt ?? "—",
                ]),
            ));
            console.log(`\n${countLine(rows.length, "resource")}`);
        }, options);
    })
    .command(
        "inspect <handle:string>",
        "One resource in full — by externalId, identifier, or any lookup key.",
    )
    .option(
        "--resource <id:string>",
        "Disambiguate when two defs share a handle.",
    )
    .option("-j, --json", "Emit the raw row as JSON.")
    .option("--pretty", "Force the formatted view even when piped.")
    .action(async (options, handle) => {
        const store = await openStore();
        // the handle may address ANY indexed key, so the search is over
        // resource defs, not over a single id the caller had to know
        const candidates = options.resource !== undefined
            ? [options.resource]
            : [...new Set((await store.list()).map((row) => row.resource))];
        let found: OwnedResource | undefined;
        for (const resource of candidates) {
            found = await store.get(resource, handle);
            if (found !== undefined) break;
        }
        store.close();
        if (found === undefined) {
            console.error(
                mark.fail(
                    `no owned resource answers to "${handle}"` +
                        (options.resource ? ` under ${options.resource}` : ""),
                ),
            );
            Deno.exit(1);
        }
        const row = found;
        emit(row, () => {
            console.log(
                `${row.resource}  ${mark.muted(typeOf(row))}`,
            );
            console.log();
            console.log(fields([
                ["external id", row.externalId],
                ["identifier", displayName(row)],
                ...Object.entries(row.keys ?? {}).map((
                    [name, value],
                ): [string, string] => [`key:${name}`, value]),
                ["synced", row.syncedAt ?? "—"],
            ]));
            console.log();
            console.log(mark.muted("  data"));
            console.log(
                JSON.stringify(row.data, null, 2)
                    .split("\n")
                    .map((line) => `  ${line}`)
                    .join("\n"),
            );
        }, options);
    })
    .command("released", "Release tombstones (audit trail, not owned).")
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const store = await openStore();
        const rows = await store.released();
        store.close();
        emit(rows, () => {
            if (rows.length === 0) {
                console.log(mark.muted("nothing released in this environment"));
                return;
            }
            console.log(table(
                ["RESOURCE", "EXTERNAL ID", "RELEASED AT"],
                rows.map((row) => [
                    row.resource,
                    row.externalId,
                    row.releasedAt,
                ]),
            ));
            console.log(`\n${countLine(rows.length, "tombstone")}`);
        }, options);
    })
    .command(
        "reindex",
        "Re-derive lookup keys for stored rows (after a def adds a key).",
    )
    .option("-j, --json", "Emit the counts as JSON.")
    .option("--pretty", "Force the formatted line even when piped.")
    .action(async (options) => {
        const store = await openStore();
        const result = await store.reindex();
        store.close();
        emit(result, () => {
            console.log(
                mark.ok(
                    `re-indexed ${result.rows} row(s) — ${result.keys} ` +
                        `lookup key(s) written`,
                ),
            );
        }, options);
    })
    .command(
        "forget <handle:string>",
        "Drop a row LOCALLY without releasing it upstream.",
    )
    .option(
        "--resource <id:string>",
        "Disambiguate when two defs share a handle.",
    )
    .option("--force", "Required: this desynchronizes you from the vendor.")
    .action(async (options, handle) => {
        if (!options.force) {
            console.error(
                mark.fail(
                    "forget needs --force: it removes the LOCAL row only. " +
                        "The vendor keeps the resource and keeps billing " +
                        "for it — use the provider's release endpoint " +
                        "unless you are repairing a wedged store.",
                ),
            );
            Deno.exit(1);
        }
        const store = await openStore();
        const candidates = options.resource !== undefined
            ? [options.resource]
            : [...new Set((await store.list()).map((row) => row.resource))];
        let dropped = false;
        for (const resource of candidates) {
            dropped = await store.forget(resource, handle);
            if (dropped) {
                console.error(
                    mark.warn(
                        `forgot ${resource} "${handle}" locally — NOT ` +
                            `released upstream`,
                    ),
                );
                break;
            }
        }
        store.close();
        if (!dropped) {
            console.error(
                mark.fail(`no owned resource answers to "${handle}"`),
            );
            Deno.exit(1);
        }
    })
    .parse(Deno.args);
