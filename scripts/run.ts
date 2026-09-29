/**
 * deno task engine:run <provider>#<endpoint> [--body '<json>']
 *                      [--query-params '<json>'] [--path-params '<json>']
 *
 * JIT: compile (or reuse the .output/ cache), pick the endpoint from the
 * bundle (sealUnit), execute it through Engine.load with directTransport
 * (credentials from env <NAME>_API_KEY), print the result including usage.
 *
 * ONE encoding: the flags ARE zRunInput's fields in CLI kebab-case
 * (cliffy maps --query-params → options.queryParams etc. — verbatim field
 * match, no escape hatch, no precedence rules).
 */
import { Command } from "@cliffy/command";
import { z } from "zod";
import {
    type Json,
    type OwnedResource,
    parseSchema,
    type RunInput,
    sealUnit,
    zOwnedResource,
} from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { compileToOutput } from "./lib.ts";
import {
    admitInto,
    defsFromBundle,
    KvResourceStore,
    persistEffects,
} from "./store/kv.ts";
import { emit, fields, mark } from "./output.ts";
import { dim } from "@std/fmt/colors";

function parseJson(flag: string, raw: string): Json {
    try {
        return JSON.parse(raw) as Json;
    } catch (error) {
        throw new Error(`${flag} is not valid JSON: ${error}`);
    }
}

const { options, args } = await new Command()
    .name("engine:run")
    .description(
        "Compile (cached) and execute one endpoint with env credentials.",
    )
    .arguments("<endpoint:string>")
    .option("--body <json:string>", "RunInput.body (JSON).")
    .option(
        "--query-params <json:string>",
        "RunInput.queryParams (JSON object).",
    )
    .option("--path-params <json:string>", "RunInput.pathParams (JSON object).")
    .option(
        "--resources <file:string>",
        "Owned-resource rows (a JSON file of OwnedResource[]) served to " +
            "the ownership window INSTEAD of the local store — a fixture " +
            "window, nothing persisted. Default: the Deno KV store at " +
            ".output/local.db (provisions survive across runs).",
    )
    .option(
        "--scope-key <key:string>",
        "The opaque scope token ensure fns see (default: local).",
    )
    .option("-j, --json", "Emit the full run envelope as JSON.")
    .option("--pretty", "Force the formatted summary even when piped.")
    .parse(Deno.args);

const endpointId = args[0];

const input: RunInput = {
    ...(options.body !== undefined
        ? { body: parseJson("--body", options.body) }
        : {}),
    ...(options.queryParams !== undefined
        ? {
            queryParams: parseJson(
                "--query-params",
                options.queryParams,
            ) as RunInput["queryParams"],
        }
        : {}),
    ...(options.pathParams !== undefined
        ? {
            pathParams: parseJson(
                "--path-params",
                options.pathParams,
            ) as RunInput["pathParams"],
        }
        : {}),
};

const { bundle, cacheHit } = await compileToOutput();
console.error(
    `[engine:run] ${
        cacheHit ? "cache hit" : "compiled"
    } — loading ${endpointId}`,
);

// the CLI's ownership window (design D47): the Deno KV store at
// .output/local.db by DEFAULT — the local host loop's persistence, so a
// provision made by one run is owned in the next. --resources swaps in a
// fixture window (rows from a file, NOTHING persisted).
const store = options.resources === undefined
    // the bundle supplies each resource's type + lookup-key paths, so a
    // persisted row carries them without the store loading anything
    ? await KvResourceStore.open({ defs: defsFromBundle(bundle) })
    : undefined;
/** Where a provision LANDS — named in the summary so the next command
 *  (`deno task resources list`) is obvious rather than folklore. */
const storePath = store ? ".output/local.db" : `${options.resources} (fixture)`;
const fixtureRows: OwnedResource[] = options.resources !== undefined
    ? parseSchema(
        z.array(zOwnedResource),
        JSON.parse(await Deno.readTextFile(options.resources)),
        `--resources ${options.resources}`,
    )
    : [];

const unit = sealUnit(bundle, endpointId);
const log = (line: string) => console.error(`[engine:run] ${line}`);
const engine = new Engine({
    transport: directTransport(),
    resources: store ?? {
        owned: (query) =>
            Promise.resolve(
                fixtureRows.filter((row) =>
                    row.resource === query.resource &&
                    (query.externalId === undefined ||
                        row.externalId === query.externalId)
                ),
            ),
    },
    // HOST ORDERING (v1): run() hands ensure's seeds here BEFORE start
    // executes — a mid-run crash never orphans an upstream resource
    ...(store ? { admit: admitInto(store, log) } : {}),
    scopeKey: options.scopeKey ?? "local",
});
const loaded = await engine.load(unit);
const result = await loaded.run(input);

// settle EFFECTS → the store (the host's persistence work-orders)
if (store) await persistEffects(store, result.resources, log);
store?.close();

/**
 * The human summary (design D49). A run envelope is forty correct fields
 * in which the three that decide your next command — did it work, what
 * did it cost, what id did it create — are indistinguishable from the
 * rest. So a terminal gets those three; a pipe still gets the envelope
 * verbatim, and `-j` forces it either way.
 */
function renderRun(): void {
    const status = `${result.kind} ${result.httpStatus}`;
    const ms = result.timing.providerTotalMs;
    const headline = `${endpointId}  ${mark.muted(status)}  ${
        mark.muted(`${(ms / 1000).toFixed(1)}s`)
    }`;
    console.log(
        result.isProviderError ? mark.fail(headline) : mark.ok(headline),
    );
    console.log();

    const rows: [string, string][] = [];
    // A vendor (or gate) failure is DATA here, so the reason lives in
    // `output` like any other body. Surface it: a summary that says only
    // "404" makes the operator go read the JSON they were spared.
    if (result.isProviderError) {
        const body = result.output as Record<string, unknown> | null;
        const message = typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
            ? body.error
            : JSON.stringify(result.output)?.slice(0, 160);
        if (message) rows.push(["error", message]);
    }
    const credits = Object.entries(result.usage.credits ?? {});
    if (credits.length > 0) {
        // the DECLARED card and the SETTLED amount can differ (a vendor
        // quote overrides the doc's flat line); the engine records that
        // under usage.mismatch, so say so instead of leaving two numbers
        // to be discovered
        const derived = result.usage.mismatch?.derived as
            | Record<string, number>
            | undefined;
        rows.push([
            "usage",
            credits.map(([credit, amount]) => {
                const declared = derived?.[credit];
                return `${amount} ${credit}` +
                    (declared !== undefined && declared !== amount
                        ? `  ${
                            mark.warn(
                                `declared ${declared} — see usage.mismatch`,
                            )
                        }`
                        : "");
            }).join(", "),
        ]);
    }
    if (result.resources?.releases?.length) {
        for (const target of result.resources.releases) {
            rows.push(["released", `${target.resource}  ${target.externalId}`]);
        }
    }
    if (rows.length > 0) console.log(fields(rows));

    // PROVISIONS get their own block: the externalId is the single most
    // load-bearing string in the whole envelope — it is what every later
    // command takes — and it used to be buried
    for (const seed of result.resources?.provisions ?? []) {
        console.log();
        console.log(`  ${dim("provisioned")}  ${seed.resource}`);
        console.log(fields(
            [
                ["id", seed.externalId],
                ...(seed.identifier !== undefined &&
                        seed.identifier !== seed.externalId
                    ? [["identifier", seed.identifier] as [string, string]]
                    : []),
                ["stored in", storePath],
            ],
            "    ",
        ));
    }

    console.log();
    console.log(mark.muted("  -j for the full envelope"));
}

emit(result, renderRun, options);
if (result.isProviderError) Deno.exit(1);
