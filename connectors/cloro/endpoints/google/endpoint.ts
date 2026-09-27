import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zGoogleBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "cloro Google Search",
        summary:
            "Scrape a Google search result page into structured JSON, with the AI Overview on request.",
        description: "Run a Google web search as a real user in a chosen " +
            "country, city or device, and get the result page as " +
            "structured JSON: organic results, sponsored ads, shopping " +
            "cards, People Also Ask, local pack, related searches, and " +
            "optionally the AI Overview with its cited sources. Send a " +
            "query with country (or gl), or a complete Google search URL. " +
            "Up to 10 pages per request. Use it for rank tracking and to " +
            "see which pages the AI Overview cites. For Google News use " +
            "cloro#monitor/google/news; for Google AI Mode use " +
            "cloro#monitor/aimode.",
        docsUrl: "https://cloro.dev/docs/api-reference/endpoint/monitor-google",
        categories: ["web-search", "seo", "geo"],
        notes: [
            "Billing: 5 credits per request (3 base + 2 sync surcharge), " +
            "plus 2 credits per page after the first, plus 2 credits for " +
            "the AI Overview add-on (aioverview or paaAioverview).",
        ],
    },
    request: { method: "POST", path: "/monitor/google" },
    input: {
        schema: {
            // cloro's three request shapes (anyOf, required keys per arm)
            body: z.union([
                zGoogleBody.required({ query: true, country: true }),
                zGoogleBody.required({ query: true, gl: true }),
                zGoogleBody.required({ url: true }),
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
                    description: "result pages after the first",
                    consumes: { credit: "default", amount: 2 },
                },
                ai_overview: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "AI Overview",
                    description: "AI Overview add-on (aioverview or " +
                        "paaAioverview)",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        /** The page count is `pages`, or, for a url request, the query
         *  string's `num` read as depth: ceil(num / 10), at most 10, where a
         *  missing or non-numeric num counts as 10 (one page). Both
         *  defaults are cloro's documented ones. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const include = body.include ?? {};
            // URL is not a closed-term global: cut the fragment, then
            // read num from the query string only
            const match = typeof body.url === "string"
                ? /[?&]num=([^&]*)/.exec(body.url.split("#")[0])
                : null;
            const num = match !== null && /^\d+$/.test(match[1])
                ? Number(match[1])
                : 10;
            const pages = body.pages ??
                (num < 1 ? 1 : Math.min(Math.ceil(num / 10), 10));
            const aiOverview = include.aioverview !== undefined ||
                include.paaAioverview === true;
            return {
                counts: {
                    ...(pages > 1 ? { extra_page: pages - 1 } : {}),
                    ...(aiOverview ? { ai_overview: 1 } : {}),
                },
            };
        },
        evidence: ({ data }) => {
            const body = data.input.body;
            const include = body.include ?? {};
            // URL is not a closed-term global: cut the fragment, then
            // read num from the query string only
            const match = typeof body.url === "string"
                ? /[?&]num=([^&]*)/.exec(body.url.split("#")[0])
                : null;
            const num = match !== null && /^\d+$/.test(match[1])
                ? Number(match[1])
                : 10;
            const pages = body.pages ??
                (num < 1 ? 1 : Math.min(Math.ceil(num / 10), 10));
            const aiOverview = include.aioverview !== undefined ||
                include.paaAioverview === true;
            return {
                counts: {
                    ...(pages > 1 ? { extra_page: pages - 1 } : {}),
                    ...(aiOverview ? { ai_overview: 1 } : {}),
                },
            };
        },
    },
});
