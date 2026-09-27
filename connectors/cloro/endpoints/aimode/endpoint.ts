import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zAimodeBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "cloro Google AI Mode",
        summary:
            "Get Google AI Mode's answer, cited sources and products for a prompt, in a chosen country.",
        description: "Run a prompt on Google AI Mode as a real user in a " +
            "chosen country, city or device, and get the answer as " +
            "structured JSON: the answer text, the cited sources, shopping " +
            "cards and inline products, and optionally the merchant offers " +
            "for up to 6 product clusters. Use it to see whether and how " +
            "Google's AI search mentions or cites a brand, a product or a " +
            "page. For the AI Overview on the classic SERP use " +
            "cloro#monitor/google.",
        docsUrl: "https://cloro.dev/docs/api-reference/endpoint/monitor-aimode",
        categories: ["ai-search", "geo"],
        notes: [
            "Billing: 6 credits per request (4 base + 2 sync surcharge), " +
            "plus 1 credit per product cluster returned when " +
            "expandProducts is on (at most 6).",
        ],
    },
    request: { method: "POST", path: "/monitor/aimode" },
    input: {
        schema: {
            // cloro requires country or gl. A union survives compilation
            // as anyOf (one required key per arm); a .refine would not.
            body: z.union([
                zAimodeBody.required({ country: true }),
                zAimodeBody.required({ gl: true }),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    description: "4 base credits + 2 sync surcharge",
                    consumes: { credit: "default", amount: 6 },
                },
                expanded_product: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "expanded products",
                    description: "product clusters returned with merchant " +
                        "offers (expandProducts)",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        /** cloro expands at most 6 product clusters per scrape; the hold
         *  covers that documented maximum. */
        estimate: ({ data }) => ({
            counts: {
                ...(data.input.body.include?.expandProducts === true
                    ? { expanded_product: 6 }
                    : {}),
            },
        }),
        /** cloro charges the clusters in result.productResults, only when
         *  expandProducts was requested. */
        evidence: ({ data, utils }) => {
            const products = data.input.body.include?.expandProducts === true
                ? utils.json.optionalGet(data.output, "$.result.productResults")
                : undefined;
            const count = Array.isArray(products) ? products.length : 0;
            return {
                counts: { ...(count > 0 ? { expanded_product: count } : {}) },
            };
        },
    },
});
