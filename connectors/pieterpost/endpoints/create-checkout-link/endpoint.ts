import { defineEndpoint } from "@shared/core";
import { zPieterPostCheckoutLinkBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create PieterPost Checkout Link",
        summary:
            "Validate and price physical mail, then return a hosted payment link.",
        description: "Create a PieterPost-hosted checkout for one or more " +
            "letters or postcards. PieterPost validates " +
            "the address, calculates the exact price, and returns a checkout " +
            "URL. Give that URL to the payer. The API call itself does not " +
            "send mail; fulfillment starts only after checkout payment succeeds.",
        docsUrl: "https://pieterpost.com/api/docs/#create-checkout-links",
        categories: ["postal-mail"],
        notes: [
            "Running this tool is free, but the returned checkout charges the " +
            "payer the displayed postage and fulfillment price if they complete it.",
            "Letters support templates, uploaded attachments, saved Business " +
            "logos, and uploaded stamp images. Postcards support uploaded fronts.",
            "Always reuse idempotencyKey when retrying the same operation.",
        ],
    },
    endpoint: "/create-checkout-link",
    request: { method: "POST", path: "/v1/checkout-links" },
    input: { schema: { body: zPieterPostCheckoutLinkBody } },
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
