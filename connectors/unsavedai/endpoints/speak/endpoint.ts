import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { MAX_SPEAK_CHARS, zSpeakBody } from "./schema/inputs.ts";

/**
 * UnsavedAI /v1/speak — text to natural English speech (Kokoro-82M).
 *
 * Billed per character of input text ($10 per million, $0.00001 each). The
 * submitted text length IS the promisable quantity (capped at the service
 * ceiling the schema already enforces); the settle reads the characters
 * the service actually billed (`usage.billed_characters`, after it strips
 * control characters, so never more than the estimate). A missing stamp
 * bills 0, never 1: an unmeasurable run is not a chargeable one.
 */
export default defineEndpoint({
    meta: {
        displayName: "UnsavedAI Speak",
        summary:
            "Turn text into natural English speech: 28 US and UK voices, " +
            "MP3, Opus, WAV or FLAC.",
        description: "Synthesize natural English speech from up to 5,000 " +
            "characters of text with Kokoro-82M. Pick one of 28 American or " +
            "British voices ('af_'/'am_' American female/male, 'bf_'/'bm_' " +
            "British), a speaking rate from 0.5 to 2.0, and a format (mp3, " +
            "opus, wav, flac). Returns a private link to the audio file that " +
            "is valid for one hour and then deleted; the text is never " +
            "stored or logged. Billed per character of input ($10 per " +
            "million). About 7x faster than real time: a 1,000-character " +
            "answer (~65 s of speech) takes ~10 s. A busy server answers 429 " +
            "'busy' and a failed synthesis 422 — neither is charged.",
        categories: ["speech"],
        notes: [
            "English only: text in other languages is read with English " +
            "pronunciation or rejected as 'no_speech'.",
            "Download the audio_url within the hour; it is deleted after " +
            "expires_at.",
            "Numbers, currency and common abbreviations are read naturally " +
            "('$0.01' is spoken as 'one cent').",
        ],
    },
    /** PUBLIC identity (D22): pinned, so the id stays `unsavedai#speak`. */
    endpoint: "/speak",
    request: { method: "POST", path: "/v1/speak" },
    input: { schema: { body: zSpeakBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CHARACTER,
            label: "characters",
            // $10 per million characters, billed per character
            consumes: { credit: "default", amount: 0.00001 },
        },
        estimate: ({ data }) => ({
            counts: {
                // fns are closed terms: the 5,000 ceiling is MAX_SPEAK_CHARS, inlined
                "CHARACTER": Math.min(data.input.body.text.length, 5000),
            },
        }),
        evidence: ({ data, utils }) => {
            const raw = utils.json.optionalNum(
                data.output,
                "$.usage.billed_characters",
            );
            return {
                counts: {
                    "CHARACTER": raw !== undefined && raw > 0
                        ? Math.ceil(raw)
                        : 0,
                },
            };
        },
    },
});

export { MAX_SPEAK_CHARS };
