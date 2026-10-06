import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsHistoricalSerpsBody } from "./schema/inputs.ts";

/**
 * Historical SERPs — `POST /v3/dataforseo_labs/google/historical_serps/live`
 * (v1 `/labs/historical-serps`). Per-row: $0.00012 per row returned, no
 * request fee (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Historical SERPs",
        summary: "Get monthly historical Google SERP snapshots for a keyword.",
        description:
            "Historical Google SERPs for a keyword, one snapshot per " +
            "month back to 2019. Returns per snapshot the date and the " +
            "parsed SERP items with rank, URL, title, and element type. " +
            "Supports date_from and date_to. Billed per snapshot " +
            "returned. Suited for ranking-history reconstruction and SERP " +
            "volatility studies. To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_serps/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/historical-serps",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/historical_serps/live",
    },
    input: { schema: { body: zLabsHistoricalSerpsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.00012 },
            label: "rows",
            description: "items returned (result[0].items, or its " +
                "items_count when the items were not returned)",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
