import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAccount } from "../../schema/outputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Read AI Check Balance",
        summary: "Read the available prepaid credit for standalone AI checks.",
        description:
            "Read the PB API key's USD balance and reservations. Free; " +
            "does not top up credit, change billing or inspect saved workspace evidence.",
        docsUrl: "https://api.prerenderbuddy.com/v1/developer/marketplace/docs",
        categories: ["geo"],
    },
    request: { method: "GET", path: "/account" },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
    output: { schema: zAccount },
});
