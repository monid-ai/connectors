/**
 * deno task drift [--provider <name>] [--fix]
 *
 * THE drift command (design D28): one runner for every check that asks
 * "has the VENDOR's world moved out from under our pinned defs?" —
 * published pricing, published input schemas. Distinct from tests ("is
 * our code right?"): a vendor repricing failing `deno task test` would
 * look like our bug; it isn't. Exit 1 on any finding — CI-able,
 * schedulable (.github/workflows/drift.yml).
 *
 * Per-provider SUITES (scripts/drift/<provider>.ts) exist only where the
 * vendor publishes a machine-readable surface to poll — apify today
 * (per-actor pricing + input schemas). Providers without one are guarded
 * by `test:live` (response shapes) and the D27 per-run `mismatch` signal
 * (rates, wherever a vendor meter exists); the runner SAYS so per
 * provider, so coverage is explicit, never silent.
 *
 * --fix (the D28 policy): GENERATED artifacts are rewritten (schema
 * drift → scaffold re-runs; git diff reviews); HAND-PINNED assertions
 * stay alarm-only (rate drift → .output/drift-repin.json).
 */
import { Command } from "@cliffy/command";
import type { EndpointDoc } from "@shared/core";
import { compileToOutput } from "./lib.ts";
import type { DriftSuite } from "./drift/contract.ts";
import { apifySuite } from "./drift/apify.ts";

const SUITES: DriftSuite[] = [apifySuite];

const { options } = await new Command()
    .name("drift")
    .description(
        "Check pinned defs against the vendors' live published surfaces.",
    )
    .option("--provider <name:string>", "Only this provider's suite.")
    .option(
        "--fix",
        "Rewrite generated artifacts (schemas); report hand-pinned drift.",
    )
    .parse(Deno.args);

const { bundle } = await compileToOutput();
const providers = Object.keys(bundle.providers).sort();
const wanted = options.provider !== undefined
    ? providers.filter((name) => name === options.provider)
    : providers;
if (wanted.length === 0) {
    console.error(`unknown provider: ${options.provider}`);
    Deno.exit(2);
}

let total = 0;
for (const provider of wanted) {
    const suite = SUITES.find((candidate) => candidate.provider === provider);
    if (!suite) {
        console.log(
            `${provider}: no machine-readable drift surface — guarded by ` +
                `test:live (response shapes) + the run-time mismatch ` +
                `signal (rates)`,
        );
        continue;
    }
    if (!Deno.env.get(suite.requiresEnv)) {
        console.error(
            `${provider}: ${suite.requiresEnv} is required (live checks)`,
        );
        Deno.exit(2);
    }
    const docs = Object.values(bundle.endpoints)
        .filter((doc): doc is EndpointDoc => doc.provider === provider);
    const findings = await suite.run({
        docs,
        fix: options.fix ?? false,
        log: (line) => console.log(line),
    });
    if (findings.length > 0) {
        console.error(`\n${provider} drift (${findings.length}):`);
        for (const finding of findings) {
            console.error(
                `  ${finding.docId} [${finding.check}] ${finding.message}`,
            );
        }
    } else {
        console.log(`\n${provider}: all ${docs.length} docs match live`);
    }
    total += findings.length;
}
Deno.exit(total > 0 ? 1 : 0);
