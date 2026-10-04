import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPackageRegistryMetadataApiBody } from "./schema/inputs.ts";
import { zPackageRegistryMetadataApiOutput } from "./schema/output.ts";

/**
 * conserving_celerytop/package-registry-metadata-api: Look Up Package Metadata. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Look Up Package Metadata",
        summary: "Look up npm, PyPI and crates.io packages by name or " +
            "keyword and get one flat metadata row per package.",
        description: "Looks up packages on npm, PyPI and crates.io, by exact " +
            "name (prefix a name with npm:, pypi: or crates: to pick its " +
            "registry) or by a keyword search over npm and crates.io. " +
            "Returns one flat row per package with the latest version, " +
            "license, release dates, version count, dependency counts and " +
            "list, repository and homepage links, deprecation status and, " +
            "where the registry publishes them, download counts. A name " +
            "that is not found comes back as one row with status " +
            "not_found. Reads public registry APIs only; it does not " +
            "scan vulnerabilities or read package contents.",
        docsUrl:
            "https://apify.com/conserving_celerytop/package-registry-metadata-api",
        categories: ["package-registries"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22),
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/conserving_celerytop/package-registry-metadata-api",
    request: {
        method: "POST",
        path:
            "/v2/acts/conserving_celerytop~package-registry-metadata-api/runs",
    },
    // maxItems allows 1,000 packages and crates.io is the slowest registry
    // (about 1.1 s per package at the actor's request pace, so roughly 18
    // minutes for 1,000). The actor's default run timeout is 1,500 s, so
    // the engine waits the same 1,500 s.
    timeouts: { runMs: 1_500_000 },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob, required at the
            // binding (even though the actor publishes a default of 20):
            // the estimate must be deducible to price the hold (D24/D25)
            body: zPackageRegistryMetadataApiBody.required({ maxItems: true }),
        },
    },
    // Hand-curated dataset-item schema (design D29): passthrough
    // DOCUMENTATION: non-strict, all-optional, so catalogs and agents see
    // the output shape while vendor drift can never fail a paid run.
    output: { schema: zPackageRegistryMetadataApiOutput },
    usage: {
        model: {
            // verified actor-start charge event + per-row metering
            // (the actor's published pay-per-event card)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys, and the actor's
            // charge-event names normalize onto them (strip apify-
            // prefix, kebab/camel → snake), which is the drift
            // guard's derived join (design D28)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // apify-actor-start: $0.00005 per GB of run memory,
                    // minimum one event; the actor's 512 MB default
                    // memory is under 1 GB, so one event, $0.00005
                    // (live-confirmed 2026-10-04: chargedEventCounts
                    // apify-actor-start = 1 on a default-memory run)
                    consumes: { credit: "default", amount: 0.00005 },
                },
                package_record: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "package records",
                    // Business-tier (GOLD) price of the primary
                    // package-record event, per saved package row
                    consumes: { credit: "default", amount: 0.0014 },
                },
            },
        },
        /** maxItems caps the rows saved (and so the charged records),
         *  required at the binding, so the estimate is pure arithmetic,
         *  no fallbacks (D24). It is an upper bound: fewer names than
         *  maxItems save fewer rows, and a row saved because a registry
         *  did not answer is not charged. */
        estimate: ({ data }) => ({
            counts: { "package_record": data.input.body.maxItems },
        }),
    },
});
