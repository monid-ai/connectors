import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmployeeReviewsQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/employee-reviews — aggregated review signals. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Employee Reviews",
        summary: "A company's employee review signals and reviews.",
        description: "Fetch a company's aggregated employee review signals " +
            "— overall rating, eight dimension-level scores (culture, " +
            "work-life balance, compensation, senior management, diversity " +
            "& inclusion, business outlook, CEO approval, recommendation " +
            "rate), and a paginated list of individual reviews with pros, " +
            "cons, reviewer metadata, and per-dimension ratings — sourced " +
            "from Glassdoor and other providers.",
        docsUrl:
            "https://docs.akta.pro/api-reference/alternative-data/employee-reviews",
        categories: ["company-reviews"],
    },
    request: { method: "GET", path: "/v1/company/employee-reviews/" },
    // `limit` REQUIRED at the binding (design D25 — the mirror stays the
    // faithful vendor contract, optional there): it is the estimate's
    // whole basis, so the caller states it.
    input: {
        schema: {
            queryParams: zEmployeeReviewsQueryParams.required({ limit: true }),
        },
    },
    usage: {
        /** CREDIT stays the unit here (unlike news): akta bills whole
         *  1.5-credit increments per 50 REQUESTED records and the
         *  response exposes no block quantity to settle against — credits
         *  ARE the vendor's native meter for this endpoint (design D25).
         *  Consolidate stays provider-level (counts credits_consumed). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** 1.5 credits per whole 50-record increment of the caller-stated
         *  limit — v1 evidence: employee-reviews.ts
         *  `makePerUnitPrice(0.075, 50, "result")` ("a limit=3 call still
         *  consumed the full 1.5 credits, verified in prod"). Typed read
         *  (pre-toRequest validated input — design D25). Settle trues up
         *  on `credits_consumed`. */
        estimate: ({ data }) => ({
            counts: {
                "CREDIT": Math.ceil(data.input.queryParams.limit / 50) * 1.5,
            },
        }),
    },
});
