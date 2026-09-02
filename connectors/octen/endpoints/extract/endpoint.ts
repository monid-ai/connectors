import { defineEndpoint } from "@shared/core";
import { zOctenExtractBody } from "./schema/inputs.ts";

/**
 * POST /extract — clean markdown for up to 20 URLs.
 *
 * NATIVE usage: successfully extracted URLs (`meta.usage.successful_urls`);
 * a missing receipt settles at 0 — money follows evidence (the v1 rule).
 */
export default defineEndpoint({
    meta: {
        displayName: "Octen Extract",
        summary: "Clean, LLM-ready markdown for up to 20 URLs per call.",
        description: "Extract the content of web pages as clean, " +
            "model-ready markdown or plain text. Batch up to 20 page URLs " +
            "per call, returning whole-page content or query-focused " +
            "highlights (pass 'query'), detected page structure, cache-age " +
            "control (max_age_seconds), a per-URL timeout, and optional " +
            "image/video/audio resource lists. Results preserve input " +
            "order; failed URLs are returned with status 'failed' and an " +
            "error_message — and are not billed.",
        docsUrl: "https://docs.octen.ai/api-reference/extract",
        categories: ["web-scraping"],
    },
    request: { method: "POST", path: "/extract" },
    input: { schema: { body: zOctenExtractBody } },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        consolidate: ({ data, utils }) => ({
            usage: {
                units: [{
                    amount: utils.json.optionalNum(
                        data.output,
                        "$.meta.usage.successful_urls",
                    ) ?? 0,
                    unit: "result",
                }],
                evidence: utils.json.pick(data.output, ["$.meta.usage"]),
            },
            output: utils.json.omit(data.output, ["usage"]),
        }),
    },
});
