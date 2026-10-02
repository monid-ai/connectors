import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkupFetchBody } from "./schema/inputs.ts";

/**
 * Linkup /fetch — one URL to clean markdown.
 *
 * SELECTED-PRICE billing, like /search: Linkup publishes one flat price per
 * call for each `mode` × `renderJs` cell, plus a flat surcharge when a
 * `schema` asks for structured output. One line per cell (exactly one
 * counted, from the request) and a `structured_output` line counted when
 * `schema` is present (design D19, the kling pattern).
 */
export default defineEndpoint({
    meta: {
        displayName: "Linkup Fetch",
        summary: "Fetch one URL as clean, LLM-ready markdown, optionally " +
            "with typed JSON.",
        description: "Fetch a single public web page or PDF with Linkup and " +
            "get back clean, LLM-ready markdown. Set 'renderJs' for " +
            "client-side-rendered pages, 'mode' 'pro' for hard-to-retrieve " +
            "pages, and 'extractImages' or 'includeRawContent' when you need " +
            "the page's images or original markup. Pass a JSON Schema in " +
            "'schema' (with optional 'instructions') to also get typed JSON " +
            "extracted from that same page in 'data'. It reads only the URL " +
            "you give it: it does not follow links, crawl a site, or log in " +
            "— gated pages return what an anonymous visitor sees. To find " +
            "pages in the first place, use linkup#search.",
        docsUrl:
            "https://docs.linkup.so/pages/documentation/endpoints/fetch/reference",
        categories: ["web-scraping"],
        notes: [
            "Binary URLs other than PDF (ZIP, image, video) return 400, as do " +
            "HTML pages over 20 MB and PDFs over 100 MB.",
            "instructions without schema returns 400, and schema must have " +
            "root type 'object'.",
        ],
    },
    request: { method: "POST", path: "/fetch" },
    input: {
        schema: {
            // Linkup's documented defaults, applied at the binding (D25): the
            // two price selectors the estimate reads.
            body: zLinkupFetchBody.extend({
                mode: zLinkupFetchBody.shape.mode.unwrap().default("standard"),
                renderJs: zLinkupFetchBody.shape.renderJs.unwrap()
                    .default(false),
            }),
        },
    },
    usage: {
        /** Linkup's published card, verified 2026-10-01
         *  (https://docs.linkup.so/pages/documentation/platform/pricing). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    // $0.001 — standard mode, no JS rendering
                    consumes: { credit: "default", amount: 0.001 },
                    label: "fetch",
                    description: "standard mode, no JavaScript rendering",
                },
                standard_render_js: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    // $0.005 — standard mode, renderJs
                    consumes: { credit: "default", amount: 0.005 },
                    label: "fetch + JS rendering",
                    description: "standard mode with JavaScript rendering",
                },
                pro: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    // $0.005 — pro mode, no JS rendering
                    consumes: { credit: "default", amount: 0.005 },
                    label: "pro fetch",
                    description: "pro mode, no JavaScript rendering",
                },
                pro_render_js: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    // $0.01 — pro mode, renderJs
                    consumes: { credit: "default", amount: 0.01 },
                    label: "pro fetch + JS rendering",
                    description: "pro mode with JavaScript rendering",
                },
                structured_output: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    // +$0.001 — any combination with a `schema`
                    consumes: { credit: "default", amount: 0.001 },
                    label: "structured output",
                    description: "typed JSON extraction via `schema`",
                },
            },
        },
        /** One call, priced by the request's `mode` × `renderJs`, plus the
         *  structured-output surcharge when `schema` is set. `renderJs` may be
         *  a string: Linkup renders on a case-insensitive "true" and rejects
         *  every string but "true"/"false" with an unbilled 400. */
        estimate: ({ data }) => {
            const pro = data.input.body.mode === "pro";
            const flag = data.input.body.renderJs;
            const js = flag === true ||
                (typeof flag === "string" && flag.toLowerCase() === "true");
            const key = pro
                ? (js ? "pro_render_js" : "pro")
                : (js ? "standard_render_js" : "standard");
            return {
                counts: {
                    [key]: 1,
                    ...(data.input.body.schema !== undefined
                        ? { "structured_output": 1 }
                        : {}),
                },
            };
        },
        /** A 2xx is one billed call (Linkup charges nothing on an error, and
         *  error envelopes never reach this fn) — keyed from the request. */
        evidence: ({ data }) => {
            const pro = data.input.body.mode === "pro";
            const flag = data.input.body.renderJs;
            const js = flag === true ||
                (typeof flag === "string" && flag.toLowerCase() === "true");
            const key = pro
                ? (js ? "pro_render_js" : "pro")
                : (js ? "standard_render_js" : "standard");
            return {
                counts: {
                    [key]: 1,
                    ...(data.input.body.schema !== undefined
                        ? { "structured_output": 1 }
                        : {}),
                },
            };
        },
    },
});
