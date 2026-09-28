import { defineEndpoint } from "@shared/core";
import { zPieterPostCreditTopupBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create PieterPost Credit Top-up",
        summary:
            "Add test credits or create a live Stripe Checkout top-up link.",
        description: "Create a PieterPost wallet top-up. With a test API " +
            "key, credits are applied immediately. With a live API key, " +
            "PieterPost returns a Stripe Checkout URL and credits the wallet " +
            "only after the payer completes that checkout.",
        docsUrl: "https://pieterpost.com/api/docs/#create-credit-top-ups",
        categories: ["postal-mail"],
        notes: [
            "A test-key call changes the test wallet immediately.",
            "A live-key call creates a pending top-up and external payment link.",
            "Always reuse idempotencyKey when retrying the same top-up.",
        ],
    },
    endpoint: "/create-credit-topup",
    request: { method: "POST", path: "/v1/credits/topups" },
    input: { schema: { body: zPieterPostCreditTopupBody } },
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
