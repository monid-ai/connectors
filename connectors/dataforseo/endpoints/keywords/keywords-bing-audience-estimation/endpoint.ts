import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingAudienceEstimationBody } from "./schema/inputs.ts";

/**
 * Bing Audience Estimation — `POST
 * /v3/keywords_data/bing/audience_estimation/live` (v1
 * `/keywords/bing-audience-estimation`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Audience Estimation",
        summary: "Estimate Microsoft Ads audience size for targeting criteria.",
        description:
            "Bing Ads audience estimate for a location plus optional age, " +
            "gender, industry, and job_function targeting, bid, and daily " +
            "budget. " +
            "Returns estimated audience size and suggested bid. Industry " +
            "and job function ids come from the Bing dictionaries. Suited " +
            "for LinkedIn-profile targeting in Microsoft Ads. To find " +
            "industry ids for targeting, call " +
            "dataforseo#keywords/bing-industries (free lookup). To find " +
            "job_function ids for targeting, call " +
            "dataforseo#keywords/bing-job-functions (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/audience_estimation/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-audience-estimation",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/audience_estimation/live",
    },
    input: { schema: { body: zKeywordsBingAudienceEstimationBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
