import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "unsavedai",
    meta: {
        displayName: "UnsavedAI",
        summary: "Private speech tools for agents: transcribe any audio or " +
            "video file URL, and speak text aloud.",
        description: "Private speech tools for agents. Transcribe: any " +
            "direct audio or video file URL (TikTok, Instagram, Douyin, " +
            "podcast and meeting downloads) to text in ~99 languages " +
            "including Chinese, with timestamped segments and SRT/VTT " +
            "subtitles. Speak: natural English speech from text, 28 US and " +
            "UK voices. Media is deleted as soon as its audio is decoded, " +
            "transcripts and input text are never stored or logged, and " +
            "generated audio is deleted an hour after it is made.",
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
