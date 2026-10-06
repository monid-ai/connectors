import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleLocalFinderBody } from "./schema/inputs.ts";

/**
 * Google Local Finder — `POST /v3/serp/google/local_finder/live/advanced`
 * (v1 `/serp/google-local-finder`). Page-billed: $0.002 per page of 20
 * results; the hold and the count are the results asked for, the vendor's
 * default when omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Local Finder",
        summary:
            "Fetch the Google Local Finder list of businesses for a local " +
            "search.",
        description:
            "Google Local Finder (the 'more places' list behind the local " +
            "pack) for a keyword and location. Returns businesses with " +
            "rank, title, rating and reviews count, category, address, " +
            "phone, hours, website, place_id and cid, and labels such as " +
            "'open now'. Supports depth, coordinates, mobile or desktop. " +
            "Suited for local rank tracking beyond the three-pack and " +
            "local competitor lists. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#serp/google-locations (free lookup of Google " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/local_finder/live/advanced/",
        categories: ["maps"],
        notes: [
            "Billed per page of 20 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-local-finder",
    request: {
        method: "POST",
        path: "/v3/serp/google/local_finder/live/advanced",
    },
    input: {
        schema: {
            body: zSerpGoogleLocalFinderBody.extend({
                depth: zSerpGoogleLocalFinderBody.shape.depth.unwrap().default(
                    20,
                ),
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
