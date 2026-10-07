import { defineProvider, presets } from "@shared/core";

/** Scam.ai — AI-content detection for images, video, and audio. */
export default defineProvider({
    name: "scam-ai",
    meta: {
        displayName: "Scam.ai",
        summary: "Detect AI-generated images, video, and audio with one call.",
        description: "Scam.ai is detection-as-an-API for AI-generated and " +
            "manipulated media — one endpoint takes a public media URL, " +
            "infers the media type server-side, and answers a verdict " +
            "(LIKELY_REAL, ALERT, LIKELY_AI) with a calibrated 0–1 score " +
            "and a short summary, powered by the Eva detection platform. " +
            "SOC 2 Type II and GDPR compliant; keys are self-served from " +
            "the dashboard.",
        homepageUrl: "https://scam.ai",
        docsUrl: "https://scam.ai/docs",
        categories: ["ai-detection"],
        notes: [
            "This connector accepts public https:// media URLs only; " +
            "direct file upload (multipart) is available in the native " +
            "API and SDKs, not through this connector.",
            "Failed runs are never billed: 402/429 and other error " +
            "responses carry zero usage.",
            "Video is sampled at 1 frame per second and billed per " +
            "sampled frame, capped at 20 credits per run.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.scam.ai" },
    // Synchronous for every media type — no job handle, no polling. The
    // platform's own budget is 90 s (a 19 s video answers in ~21 s); the
    // 300 s run budget mirrors the official MCP client's posture.
    timeouts: { requestMs: 300_000, runMs: 300_000 },
    usage: {
        credits: {
            default: {
                label: "Scam.ai credits",
                description: "the account's API credit balance ($0.02 per " +
                    "credit); each run's draw depends on the media — image " +
                    "1, video 1 per sampled frame (max 20), audio 1 per " +
                    "minute",
            },
        },
        // The vendor's own meter settles the bill: credits_used is lifted
        // out of the payload as the claim; the endpoint's fold is the
        // cross-check. A zero-charge run (credits_used 0 with
        // zero_charge_reason) prunes to an empty claim and bills nothing.
        consolidate: ({ data, utils }) => {
            const used = utils.json.optionalNum(data.output, "$.credits_used");
            const { rest } = utils.json.pluck(data.output, "$.credits_used");
            return {
                credits: {
                    ...(used !== undefined ? { default: used } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Scam.ai API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
