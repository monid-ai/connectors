// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Get account details",
        summary: "Get account details",
        description:
            "Get the current credit balance and subscription details of the account that owns the API key.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/account",
    request: { method: "GET", path: "/v1/account" },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
