import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";
import { zHoldersQueryParams } from "./schema/inputs.ts";

/** `GET /v1/institutional/holders/{ticker}`: 13F holders of one stock. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Institutional Holders",
        summary:
            "13F institutional holders of a US stock and how their positions changed.",
        description: "Who owns one US stock according to quarterly SEC 13F " +
            "filings: total institutional shares and value, the full holder " +
            "count, and each holder with its category (index fund, hedge " +
            "fund, activist, pension, bank, insurer, mutual fund, sovereign " +
            "wealth, endowment and others), shares, dollar value, and the " +
            "change from the prior quarter (NEW, INCREASED, DECREASED, " +
            "SOLD_OUT, UNCHANGED) in shares and percent. Pass `limit` to page through " +
            "large holder lists and to get `notableChanges`, and sort by " +
            "`sharesChangePct` to see who moved most. 13F data lags: a " +
            "quarter is filed up to 45 days after it ends.",
        docsUrl: "https://sentisense.ai/docs/api/institutional-flows",
        categories: ["ownership-filings"],
        notes: [
            "The holders arrive under `data` in the `{isPreview, " +
            "previewReason, data}` envelope.",
            "`holderCount` is always the full count, even when `holders` " +
            "is one page of it.",
        ],
    },
    request: { method: "GET", path: "/v1/institutional/holders/{ticker}" },
    input: {
        schema: {
            pathParams: zTickerPathParams,
            queryParams: zHoldersQueryParams,
        },
    },
    /** Analytics class: 2 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
