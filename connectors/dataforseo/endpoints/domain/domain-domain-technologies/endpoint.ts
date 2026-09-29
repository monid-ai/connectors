import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDomainDomainTechnologiesBody } from "./schema/inputs.ts";

/**
 * Website Technologies — `POST
 * /v3/domain_analytics/technologies/domain_technologies/live` (v1
 * `/domain/domain-technologies`). Flat: $0.012 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Website Technologies",
        summary: "Detect the technology stack a domain runs, from CMS to " +
            "analytics.",
        description: "Technologies detected on a target domain. Returns the " +
            "domain's title, description, rank, country and language, and " +
            "the technology tree grouped by category (CMS, e-commerce, " +
            "analytics, frameworks, CDN, advertising, and more) with each " +
            "technology's name. Suited for tech-stack enrichment of " +
            "company records.",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/domain_technologies/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/domain-technologies",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/domain_technologies/live",
    },
    input: { schema: { body: zDomainDomainTechnologiesBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.012 },
        },
    },
});
