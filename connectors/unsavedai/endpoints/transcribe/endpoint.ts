import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTranscribeBody } from "./schema/inputs.ts";

/**
 * UnsavedAI /v1/transcribe — speech-to-text for a media file URL.
 *
 * Billed per started minute of processed audio. `max_minutes` is the
 * caller's cap and therefore the pre-run estimate (D25: limiting knob
 * REQUIRED at the binding); the settle reads the minutes actually
 * processed from the raw envelope.
 */
export default defineEndpoint({
    meta: {
        displayName: "UnsavedAI Transcribe",
        summary:
            "Transcribe any audio/video file URL — timestamps and SRT/VTT subtitles.",
        description: "Transcribe a direct audio or video file URL into text " +
            "in ~99 languages (auto-detected, including Mandarin for Douyin). " +
            "Pair it with a video-download endpoint: fetch a TikTok, " +
            "Instagram Reel, Douyin or podcast file URL first, then pass it " +
            "here. 'include' adds timestamped 'segments' and 'srt'/'vtt' " +
            "subtitles. 'max_minutes' (1-30) caps how much audio is processed " +
            "and billed; longer media is truncated and flagged 'truncated'. " +
            "Typical speed is ~9x real time (a 1-minute clip in ~7 s). A web " +
            "page URL fails fast with 'not_media' and a busy server answers " +
            "429 'busy' — neither is charged. Media is deleted after decoding; " +
            "nothing is stored.",
        categories: ["speech"],
        notes: [
            "Pass the media FILE url (e.g. a .mp4/.m4a/.mp3 download link), " +
            "not the social post's page URL.",
            "Set max_minutes close to the clip length: the server admits a " +
            "bounded number of reserved minutes, so oversized caps are " +
            "likelier to get 429 'busy' at peak.",
        ],
    },
    /** PUBLIC identity (D22): pinned, so the id stays `unsavedai#transcribe`
     *  even though the route is versioned. */
    endpoint: "/transcribe",
    request: { method: "POST", path: "/v1/transcribe" },
    input: {
        schema: { body: zTranscribeBody.required({ max_minutes: true }) },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.MINUTE,
            label: "audio minutes",
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => ({
            counts: { "MINUTE": data.input.body.max_minutes },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                "MINUTE": utils.json.optionalNum(
                    data.output,
                    "$.usage.billed_minutes",
                ) ?? 0,
            },
        }),
    },
});
