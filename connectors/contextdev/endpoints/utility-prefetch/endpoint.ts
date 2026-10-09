import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPrefetchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Prefetch Brand Data",
        summary:
            "Warm the brand or styleguide cache for a domain before a lookup.",
        description: "Queue a free background extraction for a domain so a " +
            "later brand or styleguide lookup returns from a warm cache " +
            "instead of failing fast or timing out on a never-crawled " +
            "domain. Accepts a domain or a work email (its domain is " +
            "extracted and validated), warms either the brand-data or the " +
            "styleguide cache, and returns immediately with a queued " +
            "acknowledgment — there is nothing to poll; retry the real " +
            "lookup after a short wait. Suited as the first step of signup " +
            "enrichment and onboarding flows.",
        docsUrl: "https://docs.context.dev/api-reference/utility/prefetch",
        categories: ["company-enrichment"],
        notes: ["Requires a paid Context.dev subscription (403 otherwise)."],
    },
    request: { method: "POST", path: "/utility/prefetch" },
    input: { schema: { body: zPrefetchBody } },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    /** 0 credits — https://www.context.dev/pricing (2026-09-17). */
    usage: { model: { kind: UsageModelKind.FREE } },
});
