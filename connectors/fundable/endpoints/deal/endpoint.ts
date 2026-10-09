import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDealPathParams } from "./schema/inputs.ts";

/** GET /deals/{id} — one funding round by UUID, flat per call. */
export default defineEndpoint({
    meta: {
        displayName: "Get Funding Round",
        summary: "Get a specific funding round by ID.",
        description: "Fetch one funding round by UUID. Returns round_type, " +
            "pre/extension flags, date, total_round_raised, valuation " +
            "(pre/post money, currency), financings tranches, deal " +
            "descriptions, company_id, investor_ids, angel_investor_ids, " +
            "and source articles. Suited for enriching a deal id obtained " +
            "from a search, a company history, or an investor portfolio.",
        docsUrl: "https://docs.tryfundable.ai/api-reference/deals/get",
        categories: ["funding-data"],
    },
    // PUBLIC identity = request.path (design D22): `{id}` segments are
    // legal identity since the 0.3.0 grammar, so the v1-faithful
    // `fundable#deals/{id}` replaces the invented `/deal` pin
    // (reconcile 2026-09-16).
    request: { method: "GET", path: "/deals/{id}" },
    input: { schema: { pathParams: zDealPathParams } },
    usage: {
        /** 1 credit per call — v1 drill (2026-09-01). Estimate/evidence
         *  are compiler-synthesized (flat model); the provider
         *  consolidate lifts `meta.credits_used`. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "lookup",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
