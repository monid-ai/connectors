import { defineEndpoint } from "@shared/core";
import { zPieterPostComposeLinkBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create PieterPost Review Link",
        summary:
            "Create a secure PieterPost composer link with a prefilled recipient and message.",
        description: "Create a short-lived PieterPost composer link with a " +
            "prefilled postal address and optional letter text. Give the URL " +
            "to the user so they can review, edit, select options, and pay in " +
            "PieterPost. This call never sends mail and never charges the user.",
        docsUrl: "https://pieterpost.com/api/docs/#create-a-compose-link",
        categories: ["postal-mail"],
        notes: [
            "Use this when the user should review or edit the letter before checkout.",
            "Always reuse idempotencyKey when retrying the same operation.",
        ],
    },
    endpoint: "/create-compose-link",
    request: { method: "POST", path: "/v1/compose-links" },
    input: { schema: { body: zPieterPostComposeLinkBody } },
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
