import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Court Rules (courtrules.app) - judge-level US court filing rules, court
 * holiday calendars and privacy-enforcement data, for agents.
 *
 * Every endpoint is a read-only GET against the documented REST API at
 * https://api.courtrules.app/api/v1/..., and the vendor publishes a machine
 * readable spec at https://api.courtrules.app/openapi.json, so the defs
 * mirror the published surface instead of inventing structure.
 *
 * Auth: a Court Rules API key (issued at https://console.courtrules.app)
 * travels as `Authorization: Bearer <key>`; the engine injects it at egress
 * only, so no fn ever sees the credential.
 */
export default defineProvider({
    name: "court-rules",
    meta: {
        displayName: "Court Rules",
        summary:
            "Judge-level US court filing rules, court holiday calendars and enforcement data.",
        description:
            "Court Rules structures standing orders and individual practices " +
            "into data agents can use: the judges of a district with their " +
            "extracted filing rules, the closure calendar for deadline math, " +
            "and the rules behind each document type. Every rule carries a " +
            "citation back to the page and section of the order it came from.",
        homepageUrl: "https://www.courtrules.app",
        docsUrl: "https://docs.courtrules.app/api-reference/overview",
        categories: ["legal-research"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.courtrules.app" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        // FREE (design D27): Court Rules publishes its API as free to use,
        // rate limited and never metered, so the model ALONE says so. Both
        // quantities slots compile to the one synthesized empty counts fn
        // and no vendor meter exists to consolidate. A future price change
        // is a MODEL change, not a rate-card surprise.
        model: { kind: UsageModelKind.FREE },
    },
});
