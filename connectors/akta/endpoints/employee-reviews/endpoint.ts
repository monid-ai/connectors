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
        /** REVIEWS are the quantity; the 50-record increment lives in
         *  `every` and the 1.5-credit draw in `consumes` (design D26) —
         *  the ceil fold is engine-owned. v1 evidence:
         *  `makePerUnitPrice(0.075, 50, "result")` ("a limit=3 call still
         *  consumed the full 1.5 credits, verified in prod"). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "reviews",
            every: 50,
            consumes: { credit: "default", amount: 1.5 },
        },
        /** The caller-stated limit IS the review promise (typed read of
         *  the pre-toRequest validated input — design D25). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
        /** Akta bills whole increments of the REQUESTED limit regardless
         *  of delivery (v1-verified), so settle counts the same quantity
         *  the vendor charges on; `credits_consumed` stays in the raw
         *  run record. */
        consolidate: ({ data, utils }) => ({
            usage: {
                counts: {
                    "RESULT": utils.json.num(
                        data.input.queryParams ?? {},
                        "$.limit",
                    ),
                },
            },
            output: utils.json.omit(data.output, ["credits_consumed"]),
        }),
    },
});
