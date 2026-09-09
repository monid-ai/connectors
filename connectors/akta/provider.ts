import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";

/**
 * Akta (akta.pro, by Wokelo) — company intelligence. Every endpoint is a
 * synchronous GET against `https://api.akta.pro/api/v1/...`, so both hooks
 * live HERE and every endpoint inherits them (leaf-wise fallback):
 *
 *   - `input.toRequest`: Akta renders ARRAY query params as ONE
 *     comma-separated value (per its docs) — the engine sends only scalar
 *     query values, so this generic hook joins every array leaf before the
 *     wire. Closed term: Object/Array are lint-whitelisted pure globals.
 *   - `usage.consolidate`: Akta's NATIVE meter is CREDITS ($1 = 20
 *     credits, per docs.akta.pro/getting-started/pricing) and every
 *     response reports its own draw in `credits_consumed` — the vendor's
 *     claim, lifted out of the payload in one motion (design D27).
 *   - `usage.evidence`: the generic quantities default — endpoints
 *     override only when their counting diverges (subclassing, D27).
 */
export default defineProvider({
    name: "akta",
    meta: {
        displayName: "Akta",
        summary: "Company intelligence: news, enrichment, and reviews.",
        description: "Akta by Wokelo — private-markets company intelligence " +
            "for agents: enriched, entity-resolved news with topic and " +
            "industry monitoring; 75+ field company enrichment " +
            "(firmographics, assessment, funding, business model, and " +
            "more); industry-code resolution; and employee & product " +
            "reviews across 20M+ companies globally.",
        homepageUrl: "https://akta.pro",
        docsUrl: "https://docs.akta.pro",
        categories: ["company-enrichment"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    // Endpoint paths carry a TRAILING SLASH: akta 307-redirects the bare
    // form to it, and the engine's transport is redirect: "manual" (auth
    // headers must never silently travel across redirects).
    request: { baseUrl: "https://api.akta.pro/api" },
    input: {
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: Object.fromEntries(
                Object.entries(data.input.queryParams ?? {}).map((
                    [key, value],
                ) => [key, Array.isArray(value) ? value.join(",") : value]),
            ),
        }),
    },
    usage: {
        /** THE credit system (design D26) — akta's own meter, declared
         *  ONCE for every endpoint (single pool ⇒ id `default`); the
         *  tier's $/credit is the broker card's one akta row. Each
         *  endpoint's model states its lines' credit draws (the rate
         *  card lives in the defs). */
        credits: { default: { label: "Akta credits" } },
        /** The vendor's OWN claim (design D27): every akta response
         *  reports `credits_consumed` — pluck it (read + strip, one
         *  motion). Entry OMITTED when the field is absent (never `?? 0`
         *  — an absent meter must fall back to the derived fold, and a
         *  present 0 on the FREE lookups prunes to an empty claim). The
         *  claim WINS at settle; the model fold is the cross-check
         *  (`usage.mismatch.derived` on disagreement). v1 lineage:
         *  providerFormatOutput + getActualCost, one fn. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_consumed",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
        /** The generic QUANTITIES default (design D27): akta's uniform
         *  envelope puts delivered items in a top-level `data` array, so
         *  the count keys off the doc's OWN model — FREE/flat → nothing
         *  to count; leaf metered → the unit; composite → the sole
         *  metered line (≥2-metered docs are compiler-forced to own
         *  their fns). Endpoints with a different counting basis
         *  (enrichment's section-keyed object, employee/product-reviews'
         *  requested-quantity billing) override. v1 lineage:
         *  extractResultCount's top-level-array arm. */
        evidence: ({ data, utils }) => {
            let key;
            switch (data.usage.model.kind) {
                case "PER_UNIT":
                    key = data.usage.model.unit;
                    break;
                case "COMPOSITE":
                    key = Object.entries(data.usage.model.components)
                        .find(([, component]) => component.kind === "PER_UNIT")
                        ?.[0];
                    break;
                case "PER_CALL":
                case "FREE":
                    key = undefined;
                    break;
            }
            if (key === undefined) return { counts: {} };
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { [key]: delivered } };
        },
    },
});
