import { join } from "@std/path";
import { compileToOutput, REPO_ROOT } from "./lib.ts";

/**
 * `deno task ids:check [--update]` — the IDENTITY GUARD (design D46).
 *
 * Doc ids are PUBLIC API: an endpoint id ("saperly#place-calls") or
 * resource id ("saperly/phone-number") that drifts silently breaks every
 * caller holding the old name. Endpoint ids may be DERIVED (`endpoint:`
 * ?? request.path) — convenient, but a vendor route move would rename
 * the id without any def edit. This lock is the guard: the committed
 * `connectors/ids.lock.json` records every published identity, and CI
 * fails when the compiled bundle disagrees.
 *
 *   - an id in the bundle but not the lock → NEW (fine — run --update
 *     and commit the lock with the change);
 *   - an id in the lock but not the bundle → REMOVED or RENAMED — a
 *     breaking change that must be deliberate (update the lock in the
 *     same commit that states the migration).
 */

const LOCK_PATH = join(REPO_ROOT, "connectors", "ids.lock.json");

interface IdsLock {
    endpoints: string[];
    resources: string[];
}

const { bundle } = await compileToOutput();
const current: IdsLock = {
    endpoints: Object.keys(bundle.endpoints).sort(),
    resources: Object.keys(bundle.resources ?? {}).sort(),
};

if (Deno.args.includes("--update")) {
    await Deno.writeTextFile(
        LOCK_PATH,
        JSON.stringify(current, null, 4) + "\n",
    );
    console.log(
        `ids.lock.json updated: ${current.endpoints.length} endpoints, ` +
            `${current.resources.length} resources`,
    );
    Deno.exit(0);
}

let lock: IdsLock;
try {
    lock = JSON.parse(await Deno.readTextFile(LOCK_PATH)) as IdsLock;
} catch {
    console.error(
        "connectors/ids.lock.json missing or unreadable — run " +
            "`deno task ids:check --update` and commit it",
    );
    Deno.exit(1);
}

let failed = false;
for (
    const family of ["endpoints", "resources"] as const
) {
    const locked = new Set(lock[family] ?? []);
    const compiled = new Set(current[family]);
    const added = current[family].filter((id) => !locked.has(id));
    const removed = [...locked].filter((id) => !compiled.has(id)).sort();
    if (added.length > 0) {
        failed = true;
        console.error(`NEW ${family} not in ids.lock.json:`);
        for (const id of added) console.error(`  + ${id}`);
    }
    if (removed.length > 0) {
        failed = true;
        console.error(
            `${family} in ids.lock.json but MISSING from the bundle ` +
                `(removed or renamed — ids are public API):`,
        );
        for (const id of removed) console.error(`  - ${id}`);
    }
}

if (failed) {
    console.error(
        "\nidentity drift — if intentional, run `deno task ids:check " +
            "--update` and commit the lock alongside the change",
    );
    Deno.exit(1);
}
console.log(
    `ids.lock.json OK: ${current.endpoints.length} endpoints, ` +
        `${current.resources.length} resources`,
);
