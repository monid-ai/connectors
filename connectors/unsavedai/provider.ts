import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "unsavedai",
    meta: {
        displayName: "UnsavedAI",
        summary:
            "Private, no-log speech-to-text for any audio or video file URL.",
        description: "Private speech-to-text for agents — transcribe any " +
            "direct audio or video file URL (TikTok, Instagram, Douyin, " +
            "podcast and meeting downloads) in ~99 languages including " +
            "Chinese, with timestamped segments and SRT/VTT subtitles. " +
            "Media is deleted from disk as soon as its audio is decoded, " +
            "before transcription, and transcripts are never stored or logged.",
        homepageUrl: "https://unsavedai.com",
        docsUrl: "https://unsavedai.com",
        categories: ["speech"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://tools.unsavedai.com" },
    /** The service admits at most 30 queued audio minutes (≈190 s of CPU
     *  work at ~9x real time) and caps downloads at 60 s, so an accepted
     *  request completes in ≈250 s worst case; anything more is refused
     *  up front with 429 (unbilled). */
    timeouts: { requestMs: 300_000, runMs: 320_000 },
    usage: {
        /** Dollar-priced vendor: the pool IS US dollars. */
        credits: { default: { label: "US dollars" } },
        /** The vendor's own claim (D27): every 200 carries
         *  `usage.cost_usd`; pluck the whole `usage` node out of the
         *  payload and let the claim win over the derived fold. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.usage");
            const cost = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.cost_usd");
            return {
                credits: { ...(cost !== undefined ? { default: cost } : {}) },
                output: rest,
            };
        },
    },
});
