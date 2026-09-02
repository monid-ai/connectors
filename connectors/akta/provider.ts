import { defineProvider, presets } from "@shared/core";

/**
 * Akta (akta.pro, by Wokelo) — company intelligence. Every endpoint is a
 * synchronous GET against `https://api.akta.pro/api/v1/...`, so both hooks
 * live HERE and every endpoint inherits them (leaf-wise fallback):
 *
 *   - `input.toRequest`: Akta renders ARRAY query params as ONE
 *     comma-separated value (per its docs) — the engine sends only scalar
 *     query values, so this generic hook joins every array leaf before the
 *     wire. Closed term: Object/Array are lint-whitelisted pure globals.
 *   - `usage.consolidate`: Akta's NATIVE metering unit is CREDITS ($1 = 20
 *     credits, per docs.akta.pro/getting-started/pricing): units = the
 *     response's `credits_consumed`, vendor cost derived from it, and the
 *     billing field absorbed out of the payload.
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
        consolidate: ({ data, utils }) => {
            const credits =
                utils.json.optionalNum(data.output, "$.credits_consumed") ?? 0;
            return {
                usage: {
                    units: [{ amount: credits, unit: "credit" }],
                    cost: utils.money.fromDollars(credits / 20),
                    evidence: utils.json.pick(data.output, [
                        "$.credits_consumed",
                    ]),
                },
                output: utils.json.omit(data.output, ["credits_consumed"]),
            };
        },
    },
});
