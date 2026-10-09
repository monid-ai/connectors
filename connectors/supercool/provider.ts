import { defineProvider, presets } from "@shared/core";

/**
 * SuperCool (supercool.com) — an AI agent that makes things: videos, images,
 * websites, presentations, documents, music and research reports. JSON over
 * HTTP against `https://api.supercool.com`, bearer auth with an `sc_key_`
 * API key, one public version: v1.
 *
 * ONE ENDPOINT, ASYNC. `POST /v1/messages` hands the agent a request in
 * plain English. Short answers come back in the submit response; work that
 * takes longer (a video, a site, a deck) answers `status: "processing"` and
 * the lifecycle long-polls `GET /v1/messages/{id}?wait=30` until `final` is
 * true, so ONE monid run returns finished work: the agent's reply, the jobs
 * it ran, and download links for every file it produced.
 *
 * EVERY SUBMIT CARRIES `Idempotency-Key: {runId}:submit`, which SuperCool
 * honors for 7 days, so a retried start converges on the message the first
 * attempt created instead of starting the work twice.
 *
 * BILLING — THE RECEIPT SETTLES EVERY RUN. Each message reports
 * `credits_used`: the SuperCool credits the work actually drew, a decimal
 * (two places). It is the vendor's claim (consolidate) and the counted
 * evidence; the count is in HUNDREDTHS of a credit so the derived fold equals
 * the receipt exactly instead of rounding a 12.5 up to 13.
 */
export default defineProvider({
    name: "supercool",
    meta: {
        displayName: "SuperCool",
        summary:
            "An AI agent that makes videos, images, websites, decks, documents, music and research.",
        description: "SuperCool is an AI agent that does creative and " +
            "knowledge work end to end. Ask in plain English and it plans " +
            "the work, runs it, and returns finished files and links: video " +
            "ads, shorts and explainers; product shots, ads and logos; " +
            "published websites and landing pages; presentations and pitch " +
            "decks; documents and reports; songs and voiceovers; and " +
            "research with sources.",
        homepageUrl: "https://supercool.com",
        docsUrl: "https://supercool.com/docs/api",
        categories: ["agents", "video-generation", "image-generation"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.supercool.com" },
    /** The submit answers within about 30 seconds (the agent replies
     *  synchronously when it can); each status read long-polls up to 30. */
    timeouts: { requestMs: 60_000, runMs: 120_000, pollMs: 2_000 },
    usage: {
        /** THE credit system (design D26): SuperCool meters work in its OWN
         *  credits; no dollar rate is pinned here — plans price credits
         *  differently, so the conversion is the broker card's job. */
        credits: {
            default: {
                label: "SuperCool credits",
                description:
                    "SuperCool credits, from a SuperCool plan or credit top-up; see https://supercool.com/pricing",
            },
        },
        /** THE VENDOR'S OWN CLAIM (design D27): `credits_used`, lifted out
         *  of the payload. Omitted when absent (never `?? 0`). */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_used",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** SuperCool's error envelope is `{error: <code>, message,
         *  request_id}`. Vendor non-2xx is DATA (the engine zero-bills it);
         *  the machine `code` is what an agent branches on
         *  (`unauthorized`, `rate_limited`, `invalid_request`,
         *  `not_found`). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "SuperCool API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
