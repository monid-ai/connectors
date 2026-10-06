import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zGoogleNewsBody } from "./schema/inputs.ts";

// cloro's documented default, applied at the binding (D25)
const zBody = zGoogleNewsBody.extend({
    pages: zGoogleNewsBody.shape.pages.unwrap().default(1),
});

export default defineEndpoint({
    meta: {
        displayName: "cloro Google News",
        summary:
            "Scrape Google News results into structured articles for a query, in a chosen country.",
        description: "Run a Google News search as a real user in a chosen " +
            "country and device, and get the articles as structured JSON: " +
            "title, link, snippet, source, date and thumbnail. Up to 10 " +
            "pages per request. Use it to monitor press coverage of a " +
            "brand or topic. For the Google web SERP use " +
            "cloro#monitor/google.",
        docsUrl:
            "https://cloro.dev/docs/api-reference/endpoint/monitor-google-news",
        categories: ["news-search"],
        notes: [
            "Billing: 5 credits per request (3 base + 2 sync surcharge), " +
            "plus 2 credits per page after the first.",
        ],
    },
    request: { method: "POST", path: "/monitor/google/news" },
    input: {
        schema: {
            // cloro requires country or gl (anyOf, one required key per arm)
            body: z.union([
                zBody.required({ country: true }),
                zBody.required({ gl: true }),
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
                    description: "3 base credits + 2 sync surcharge; " +
                        "includes the first page",
                    consumes: { credit: "default", amount: 5 },
                },
                extra_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "extra pages",
                    description: "news result pages after the first",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => {
            const pages = data.input.body.pages;
            return {
                counts: { ...(pages > 1 ? { extra_page: pages - 1 } : {}) },
            };
        },
        evidence: ({ data }) => {
            const pages = data.input.body.pages;
            return {
                counts: { ...(pages > 1 ? { extra_page: pages - 1 } : {}) },
            };
        },
    },
});
