import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTranscriptionsBody } from "./schema/inputs.ts";

/** POST /transcriptions — Transcribe Media URL */
export default defineEndpoint({
    meta: {
        displayName: "Transcribe Media URL",
        summary:
            "Turn a public media URL into a speaker-labelled, timestamped markdown transcript with chapters, plus optional SRT/VTT.",
        description: "Transcribe a public media URL — YouTube, Apple " +
            "Podcasts, Spotify episode, SoundCloud, Vimeo, Twitch VOD, Loom, " +
            "or a direct mp3/mp4/m4a link — in one run. Returns " +
            "`transcript_markdown` (speaker labels, timestamps, a chapter " +
            "table of contents), a `chapters` array (title, summary, start/end " +
            "seconds), the detected `language`, `duration_seconds` and " +
            '`title`; add `formats: ["srt", "vtt"]` for subtitle ' +
            "files. `max_charge_usd` is required and caps the charge at " +
            "US$1 per audio hour ($0.016667 per whole minute) — a job " +
            "priced above it is refused for free. Suited for: meeting and " +
            "podcast notes, video summaries, subtitle generation, " +
            "searchable archives of spoken content.",
        categories: ["speech"],
        docsUrl: "https://transcribe.so/developers/docs",
        notes: [
            "The source type (youtube / platform_url / external_url) is " +
            "derived from the URL's host; pass the URL as you would paste " +
            "it. Spotify SHOW pages are not transcribable — link an " +
            "episode.",
            "Gated YouTube videos are refused before anything is charged " +
            "with 400 video_private, video_members_only or " +
            "video_age_restricted. Login-gated media on other hosts is " +
            "only detected after the job starts and fails there (502 " +
            "transcription_failed, hold released).",
        ],
    },
    request: { method: "POST", path: "/transcriptions" },
    input: {
        schema: {
            // PRIMARY limiting knob REQUIRED at the binding (D25): the
            // estimate is deduced from the caller's own ceiling, never a
            // constant. Behavior knobs take their vendor defaults here so
            // the lifecycle reads one typed shape: language "auto", formats
            // ["markdown"].
            body: zTranscriptionsBody.required({ max_charge_usd: true })
                .extend({
                    language: zTranscriptionsBody.shape.language.unwrap()
                        .default("auto"),
                    formats: zTranscriptionsBody.shape.formats.unwrap()
                        .default(["markdown"]),
                }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.MINUTE,
            label: "audio minutes",
            description: "billed audio minutes, whole minutes up " +
                "(US$1 per hour pay-as-you-go retail)",
            consumes: { credit: "default", amount: 0.016667 },
        },
        /** The hold is the ceiling the caller authorized, in the minutes
         *  the server could charge under it. The 1e-9 nudge keeps an
         *  exact multiple (0.033334 = 2 minutes) from ceiling to 3 on a
         *  floating-point hair. */
        estimate: ({ data }) => ({
            counts: {
                MINUTE: Math.ceil(
                    data.input.body.max_charge_usd / 0.016667 - 1e-9,
                ),
            },
        }),
        /** Whole minutes up off the completed row — the vendor's own
         *  rounding; the fold (minutes × 0.016667) IS the bill (no
         *  consolidate). A completed job without a duration settles zero
         *  with a warning. */
        evidence: ({ data, utils, logger }) => {
            const seconds = utils.json.optionalGet(
                data.output,
                "$.duration_seconds",
            );
            if (
                typeof seconds !== "number" || !Number.isFinite(seconds) ||
                seconds <= 0
            ) {
                logger.warn(
                    "transcribe.so completed without a duration — zero on the derived fold",
                );
                return { counts: {} };
            }
            return { counts: { MINUTE: Math.ceil(seconds / 60) } };
        },
    },
});
