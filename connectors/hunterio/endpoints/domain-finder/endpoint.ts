import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDomainFinderQueryParams } from "./schema/inputs.ts";

/** GET /domain-finder — resolve a company name into its domain(s) (free). */
export default defineEndpoint({
    meta: {
        displayName: "Find Company Domain",
        summary: "Resolve a company name into its most likely domain name(s).",
        description: "Free canonical way to turn a company name into a " +
            "domain before calling domain- or email-level endpoints. " +
            "Returns up to 10 ranked suggestions, each with the domain, " +
            "resolved company name, logo URL, and the count of email " +
            "addresses indexed for it. Supports a perfect_match mode that " +
            "returns only high-similarity answers. Suited as the first " +
            "hop of any company-name-based workflow: resolve the domain " +
            "here, then pass it to /domain-search, /email-count, or " +
            "/companies/find.",
        docsUrl: "https://hunter.io/api-documentation/v2#domain-finder",
        categories: ["company-enrichment"],
        notes: [
            "Upstream marks this endpoint Beta; the response shape may " +
            "change.",
        ],
    },
    request: { method: "GET", path: "/domain-finder" },
    input: { schema: { queryParams: zDomainFinderQueryParams } },
    /** Free — "does not consume credits" (live docs) and v1's drill. */
    usage: { model: { kind: UsageModelKind.FREE } },
});
