import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkupSearchBody } from "./schema/inputs.ts";

/**
 * Linkup /search — real-time web search at four depths.
 *
 * SELECTED-PRICE billing: Linkup publishes one flat price per call for each
 * `depth` × `outputType` cell (flash/fast/standard share a row). The model
 * is a COMPOSITE with one line per published cell; estimate and evidence
 * read the request and count exactly one of them — the selection is a
 * COUNTING rule, never a model shape (design D19, the kling pattern). Both
 * fns read only the request, so they are byte-identical and intern to one
 * fnTable entry.
 */
export default defineEndpoint({
    meta: {
        displayName: "Linkup Search",
        summary: "Real-time web search returning cited sources, a sourced " +
            "answer, or schema-shaped JSON.",
        description: "Search the live web with Linkup and get back citable " +
            "sources (name, url, content), a written answer with the " +
            "sources it used, or JSON shaped by your own schema. Use it for " +
            "current events, facts that may have changed, and anything that " +
            "needs a verifiable source. Pick the depth by the question: " +
            "'flash' for a single fact in a few hundred milliseconds, " +
            "'fast' for one-shot retrieval in about a second, 'standard' " +
            "(the default) for questions that span several sources, 'deep' " +
            "for complex multi-hop research — it iterates and scrapes, takes " +
            "longer, and costs 10x. Filter by domain (include or exclude) " +
            "and by date range, cap the result count, and optionally include " +
            "images. It searches; it does not crawl a site or return a whole " +
            "page. When you already have the URL, use linkup#fetch instead.",
        docsUrl:
            "https://docs.linkup.so/pages/documentation/endpoints/search/reference",
        categories: ["web-search"],
        notes: [
            "outputType 'structured' requires structuredOutputSchema (a JSON " +
            "Schema serialized as a string, root type 'object'); without it " +
            "Linkup returns 400.",
            "includeInlineCitations applies only to 'sourcedAnswer' and " +
            "includeSources only to 'structured'; elsewhere they are ignored.",
            "fromDate must be before toDate.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            // Linkup requires depth and outputType; the binding defaults
            // them to the general-purpose depth and raw sources, which are
            // also the two price selectors the estimate reads.
            body: zLinkupSearchBody.extend({
                depth: zLinkupSearchBody.shape.depth.default("standard"),
                outputType: zLinkupSearchBody.shape.outputType.default(
                    "searchResults",
                ),
            }),
        },
    },
    usage: {
        /** Linkup's published card, verified 2026-10-01
         *  (https://docs.linkup.so/pages/documentation/platform/pricing). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    // $0.005 — flash/fast/standard, searchResults
                    consumes: { credit: "default", amount: 0.005 },
                    label: "search",
                    description: "flash, fast or standard depth, raw sources",
                },
                answer: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    // $0.006 — flash/fast/standard, sourcedAnswer/structured
                    consumes: { credit: "default", amount: 0.006 },
                    label: "search + answer",
                    description: "flash, fast or standard depth, sourced " +
                        "answer or structured output",
                },
                deep_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    // $0.05 — deep, searchResults
                    consumes: { credit: "default", amount: 0.05 },
                    label: "deep search",
                    description: "deep depth, raw sources",
                },
                deep_answer: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    // $0.055 — deep, sourcedAnswer/structured
                    consumes: { credit: "default", amount: 0.055 },
                    label: "deep search + answer",
                    description: "deep depth, sourced answer or structured " +
                        "output",
                },
            },
        },
        /** One call, priced by the request's `depth` × `outputType`. */
        estimate: ({ data }) => {
            const deep = data.input.body.depth === "deep";
            const raw = data.input.body.outputType === "searchResults";
            const key = deep
                ? (raw ? "deep_search" : "deep_answer")
                : (raw ? "search" : "answer");
            return { counts: { [key]: 1 } };
        },
        /** A 2xx is one billed call (Linkup charges nothing on an error, and
         *  error envelopes never reach this fn) — keyed from the request. */
        evidence: ({ data }) => {
            const deep = data.input.body.depth === "deep";
            const raw = data.input.body.outputType === "searchResults";
            const key = deep
                ? (raw ? "deep_search" : "deep_answer")
                : (raw ? "search" : "answer");
            return { counts: { [key]: 1 } };
        },
    },
});
