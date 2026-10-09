import { defineEndpoint } from "@shared/core";
import { zVerifyListingBody } from "./schema/inputs.ts";
import { zVerifyListingOutput } from "./schema/outputs.ts";

export default defineEndpoint({
    endpoint: "/verify-listing",
    meta: {
        displayName: "GarnettWork PS5 BUY check (private draft)",
        summary: "PS5 listing decision with evidence and limitations.",
        description:
            "Submit a supported secondhand listing with explicit BUY intent " +
            "to GarnettWork's dedicated partner route and preserve the native " +
            "response. Availability and partner activation are configured " +
            "outside this connector source.",
        notes: [
            "PASS, FAIL and REFUSE are application decisions. HTTP, authentication, rate-limit and transport errors are not market verdicts.",
            "Max Safe Buy may be unknown. Preserve receipt unavailability, tax exclusions, shipping scope and physical-condition limitations.",
            "A PASS is not a physical inspection, warranty or checkout-total guarantee.",
            "Committed fixtures are synthetic contract data and do not establish current listing availability or market prices.",
        ],
    },
    request: { method: "POST", path: "/monid/verify" },
    input: { schema: { body: zVerifyListingBody } },
    output: { schema: zVerifyListingOutput },
    // No projection, pricing calculation or fallback verdict: preserve the
    // native JSON, including unknowns and optional receipt limitations.
});
