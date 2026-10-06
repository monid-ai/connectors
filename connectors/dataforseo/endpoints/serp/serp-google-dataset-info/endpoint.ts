import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleDatasetInfoBody } from "./schema/inputs.ts";

/**
 * Google Dataset Details — `POST /v3/serp/google/dataset_info/live/advanced`
 * (v1 `/serp/google-dataset-info`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Dataset Details",
        summary: "Fetch full details of one Google Dataset Search entry by " +
            "dataset id.",
        description: "Details of a dataset from Google Dataset Search by " +
            "dataset_id (from google-dataset-search). Returns title, " +
            "description, authors, provider, publication and update " +
            "dates, licence, area covered, time period, formats, download " +
            "links, and citation info. Suited for dataset provenance " +
            "checks before use. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#serp/google-locations (free lookup of Google " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/dataset_info/live/advanced/",
        categories: ["web-search"],
    },
    endpoint: "/serp/google-dataset-info",
    request: {
        method: "POST",
        path: "/v3/serp/google/dataset_info/live/advanced",
    },
    input: { schema: { body: zSerpGoogleDatasetInfoBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
