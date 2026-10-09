import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleAutocompleteBody } from "./schema/inputs.ts";

/**
 * Google Autocomplete — `POST /v3/serp/google/autocomplete/live/advanced`
 * (v1 `/serp/google-autocomplete`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Autocomplete",
        summary: "Fetch Google's autocomplete suggestions for a partial query.",
        description:
            "Google search-box suggestions for a keyword, location, and " +
            "language, optionally with the cursor position and client " +
            "(chrome, gws-wiz, youtube). Returns suggestions with rank, " +
            "text, highlighted part, relevance, and suggestion type. " +
            "Suited for keyword ideation and query-intent research. To " +
            "find the location_code or exact location_name for a city or " +
            "country, call dataforseo#serp/google-locations (free lookup " +
            "of Google locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/autocomplete/live/advanced/",
        categories: ["web-search"],
    },
    endpoint: "/serp/google-autocomplete",
    request: {
        method: "POST",
        path: "/v3/serp/google/autocomplete/live/advanced",
    },
    input: { schema: { body: zSerpGoogleAutocompleteBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
