import { defineEndpoint } from "@shared/core";
import { zKeenableFetchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/fetch — clean markdown for a known URL.
 *
 * Usage falls back to the provider's PER_CALL 1 credit; estimate and
 * evidence are compiler-synthesized (flat model).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Fetch",
        summary: "Fetch a URL as clean, LLM-ready markdown.",
        description: "Retrieve a page as clean markdown, with title, " +
            "description, and author when available. By default this " +
            "returns Keenable's indexed copy — a URL that is not in the " +
            "index is an error; set 'live' to fetch it from the source " +
            "instead. Cap returned content with 'max_chars', or " +
            "pass 'prompt' (at most 2000 characters) so an LLM reads " +
            "the page and `content` is only the instruction's output " +
            "instead of the full text. Use this when you already know " +
            "the URL; start from /search if you don't.",
        docsUrl: "https://docs.keenable.ai/api-reference/fetch",
        categories: ["web-scraping"],
        notes: [
            "One credit per page, indexed or live, with or without a " +
            "prompt. Errors are free.",
        ],
    },
    request: { method: "GET", path: "/v1/fetch" },
    input: {
        schema: {
            queryParams: zKeenableFetchQueryParams.extend({
                max_chars: zKeenableFetchQueryParams.shape.max_chars
                    .unwrap().min(1).optional(),
                prompt: zKeenableFetchQueryParams.shape.prompt.unwrap()
                    .min(1).max(2000).optional(),
            }),
        },
    },
});
