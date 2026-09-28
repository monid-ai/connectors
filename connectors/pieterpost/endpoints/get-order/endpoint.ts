import { defineEndpoint } from "@shared/core";
import { zPieterPostOrderPath } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Get PieterPost Order",
        summary:
            "Fetch the current status and payment details for an API order.",
        description: "Read a PieterPost order created by the same API " +
            "account. The response includes its status, amount, payment " +
            "reference, checkout URL, timestamps, and any fulfillment error.",
        docsUrl: "https://pieterpost.com/api/docs/#track-orders",
        categories: ["postal-mail"],
        notes: [
            "PieterPost limits lookup to orders created by the authenticated API account.",
        ],
    },
    endpoint: "/get-order",
    request: { method: "GET", path: "/v1/orders/{orderId}" },
    input: { schema: { pathParams: zPieterPostOrderPath } },
});
