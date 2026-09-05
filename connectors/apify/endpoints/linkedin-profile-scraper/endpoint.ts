import { defineEndpoint } from "@shared/core";
import { zLinkedinProfileScraperBody } from "./schema/inputs.ts";

/**
 * dev_fusion/linkedin-profile-scraper — Get LinkedIn Profile.
 *
 * PURE DATA: the whole async machinery (lifecycle start/poll/stop +
 * usage.consolidate) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (`owner/name` → `owner~name`, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Get LinkedIn Profile",
        summary:
            "Extract and enrich LinkedIn profiles from URLs, including discovered emails and phone numbers.",
        description:
            "Extracts and enriches LinkedIn profile data at scale from " +
            "profile URLs — no cookies or account required. Returns " +
            "personal metadata (name, headline, summary, profile images, " +
            "location), full work history with company intelligence " +
            "(industry, website, size, founded year), education records, " +
            "skills and endorsements, languages, certifications, " +
            "publications, patents, volunteer experience, recommendations, " +
            "and enriched contact details including discovered email " +
            "addresses and phone numbers. One result per profile URL. Runs " +
            "asynchronously (typically well under a minute).",
        docsUrl: "https://apify.com/dev-fusion/linkedin-profile-scraper",
        categories: ["linkedin", "people-enrichment"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/dev_fusion~linkedin-profile-scraper/runs",
    },
    input: { schema: { body: zLinkedinProfileScraperBody } },
});
