import { defineEndpoint } from "@shared/core";
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
    request: { method: "GET", path: "/v1/company/employee-reviews" },
    input: { schema: { queryParams: zEmployeeReviewsQueryParams } },
});
