import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zClusterBuysQueryParams } from "./schema/inputs.ts";

/** `GET /v1/insider/cluster-buys`: market-wide insider cluster buys. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Insider Cluster Buys",
        summary:
            "US stocks where three or more insiders bought shares in the same window.",
        description: "Market-wide scan for insider cluster buys: every US " +
            "stock where three or more distinct insiders made open-market " +
            "purchases inside the lookback window, with the insider count, " +
            "trade count, total shares and dollar value, and the first " +
            "and last buy dates. Several insiders buying with their own " +
            "money at once is the classic Form 4 signal, and this returns " +
            "it without a per-ticker loop. Drill into any row with " +
            "sentisense#v1/insider/trades/{ticker}.",
        docsUrl: "https://sentisense.ai/docs/api/insider-trading",
        categories: ["ownership-filings"],
        notes: [
            "The clusters arrive under `data` in the `{isPreview, " +
            "previewReason, data}` envelope.",
        ],
    },
    request: { method: "GET", path: "/v1/insider/cluster-buys" },
    input: { schema: { queryParams: zClusterBuysQueryParams } },
    /** Alternative-data class: 4 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 4 },
        },
    },
});
