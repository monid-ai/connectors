import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleDatasetSearchBody } from "./schema/inputs.ts";

/**
 * Google Dataset Search — `POST
 * /v3/serp/google/dataset_search/live/advanced` (v1
 * `/serp/google-dataset-search`). Page-billed: $0.002 per page of 20
 * results; the hold and the count are the results asked for, the vendor's
 * default when omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Dataset Search",
        summary:
            "Search Google Dataset Search for public datasets matching a " +
            "query.",
        description: "Google Dataset Search results for a keyword. Returns " +
            "datasets with rank, title, dataset_id, description, " +
            "provider, update date, formats, licence, and link. Supports " +
            "depth, last_updated, file_formats, usage_rights, is_free, " +
            "and topics. Suited for finding open data for analysis. To " +
            "find the location_code or exact location_name for a city or " +
            "country, call dataforseo#serp/google-locations (free lookup " +
            "of Google locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/dataset_search/live/advanced/",
        categories: ["web-search"],
        notes: [
            "Billed per page of 20 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-dataset-search",
    request: {
        method: "POST",
        path: "/v3/serp/google/dataset_search/live/advanced",
    },
    input: {
        schema: {
            body: zSerpGoogleDatasetSearchBody.extend({
                depth: zSerpGoogleDatasetSearchBody.shape.depth.unwrap()
                    .default(20),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 20,
            consumes: { credit: "default", amount: 0.002 },
            label: "results requested",
            description: "results asked for (depth), billed per page of 20",
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.depth } }),
    },
});
