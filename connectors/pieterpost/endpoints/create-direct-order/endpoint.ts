import { defineEndpoint } from "@shared/core";
import { zPieterPostDirectOrderBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Send PieterPost Order",
        summary:
            "Create and send a physical letter or postcard using PieterPost wallet credits.",
        description: "Submit a direct-send PieterPost order for letters or " +
            "postcards. A test API key simulates the complete flow. A live " +
            "API key debits the wallet and starts real mail fulfillment when " +
            "the account is approved and has enough credits.",
        docsUrl: "https://pieterpost.com/api/docs/#create-direct-orders",
        categories: ["postal-mail"],
        notes: [
            "This endpoint has an immediate external side effect with a live " +
            "API key: it spends wallet credits and starts physical mail fulfillment.",
            "Use get-wallet before a direct order to confirm capabilities and balance.",
            "Always reuse idempotencyKey when retrying the same order.",
        ],
    },
    endpoint: "/create-direct-order",
    request: { method: "POST", path: "/v1/orders" },
    input: { schema: { body: zPieterPostDirectOrderBody } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const { idempotencyKey, ...body } = data.input.body;
            const response = await utils.request({
                body,
                headers: { "Idempotency-Key": idempotencyKey },
            });
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
            };
        },
    },
});
