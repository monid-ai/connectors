import { defineEndpoint } from "@shared/core";
import { zEstimateJobCostQueryParams } from "./schema/inputs.ts";

/** GET /jobs/cost-estimate — estimate job cost */
export default defineEndpoint({
    meta: {
        displayName: "Estimate Job Cost",
        summary: "Price a job in qBraid credits before submitting it.",
        description: "Price a job in qBraid CREDITS before submitting it. " +
            "Takes the same deviceQrn and shots you would pass to " +
            "qbraid#submit-job and returns estimatedCost (100 credits = " +
            "$1 USD). ALWAYS CALL THIS FIRST when the user has not named a " +
            "budget, and tell them the number before you submit — " +
            "qbraid#submit-job spends real credits and cannot be refunded " +
            "once the device accepts the job. The estimate is for the " +
            "device and shot count you pass, so re-estimate if either " +
            "changes. This endpoint spends nothing itself. Some devices " +
            "cannot be quoted up front: those answer pricingAvailable " +
            "false with a reason (no_pricing_configured, or " +
            "dynamic_pricing_unavailable when the price depends on the " +
            "submitted circuit). That is an answer, not a failure — tell " +
            "the user the cost is unknown for that device and let THEM " +
            "decide, rather than retrying or guessing a number. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/estimate-job-cost",
    request: { method: "GET", path: "/jobs/cost-estimate" },
    input: { schema: { queryParams: zEstimateJobCostQueryParams } },
});
