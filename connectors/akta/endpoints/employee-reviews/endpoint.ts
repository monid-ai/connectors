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
    input: { schema: { queryParams: zEmployeeReviewsQueryParams } },
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** Akta bills employee reviews at 1.5 CREDITS PER WHOLE 50-RECORD
         *  INCREMENT — v1 evidence: employee-reviews.ts priced
         *  `makePerUnitPrice(0.075, 50, "result")` ("1.5 credits per 50
         *  records × $0.05/credit … a limit=3 call still consumed the
         *  full 1.5 credits, verified in prod") and its estimate rounded
         *  the requested `limit` UP to the increment. `limit` carries the
         *  verified vendor default 10 (materialized at validation), so
         *  the STRICT num read cannot miss. Settle trues up on
         *  `credits_consumed`. */
        estimate: ({ data, utils }) => ({
            counts: {
                "CREDIT": Math.ceil(
                    utils.json.num(data.input.queryParams ?? {}, "$.limit") /
                        50,
                ) * 1.5,
            },
        }),
    },
});
