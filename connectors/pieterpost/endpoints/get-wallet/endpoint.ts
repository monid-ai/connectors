import { defineEndpoint } from "@shared/core";
import { zPieterPostWalletQuery } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get PieterPost Wallet",
        summary:
            "Read PieterPost API capabilities and the current wallet balance.",
        description: "Return the authenticated API account's direct-send " +
            "approval, API capabilities, and EUR or USD wallet balance for " +
            "the API key's test or live mode.",
        docsUrl: "https://pieterpost.com/api/docs/#read-wallet-balance",
        categories: ["postal-mail"],
        notes: [
            "Use the balance and approvedForDirectSend fields before creating a direct order.",
        ],
    },
    endpoint: "/get-wallet",
    request: { method: "GET", path: "/v1/wallet" },
    input: { schema: { queryParams: zPieterPostWalletQuery } },
});
