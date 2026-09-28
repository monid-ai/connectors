import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";
import { zCongressTradesQueryParams } from "./schema/inputs.ts";

/** `GET /v1/politicians/filings/{ticker}`: STOCK Act trades in one stock. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Congressional Trades",
        summary: "US House and Senate members' STOCK Act trades in a stock.",
        description: "Trades in one stock disclosed by members of the US " +
            "House and Senate under the STOCK Act, sourced from the House " +
            "Clerk and Senate eFD filings: the member's name, chamber, " +
            "party and state, the asset (stock, ETF or option, with the " +
            "option's details), purchase or sale, the trade and disclosure " +
            "dates with the days between them, the dollar amount range as " +
            "filed, and whose account it was (self, spouse, child, joint). " +
            "Members may disclose up to 45 days after a trade, so the " +
            "window runs on the disclosure date.",
        docsUrl: "https://sentisense.ai/docs/api/politicians",
        categories: ["ownership-filings"],
        notes: [
            "The trades arrive under `data` in the `{isPreview, " +
            "previewReason, data}` envelope.",
            "Amounts are the filed range (`amountMin` to `amountMax`), " +
            "never an exact dollar figure.",
        ],
    },
    request: { method: "GET", path: "/v1/politicians/filings/{ticker}" },
    input: {
        schema: {
            pathParams: zTickerPathParams,
            queryParams: zCongressTradesQueryParams,
        },
    },
    /** Alternative-data class: 4 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 4 },
        },
    },
});
