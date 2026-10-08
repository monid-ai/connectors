import { z } from "zod";

/** Upper bound on `text`, the service's own per-request ceiling. */
export const MAX_SPEAK_CHARS = 5000;

/** The 28 English voices the service offers (Kokoro-82M, Apache-2.0): American
 *  (a) and British (b), female (f) and male (m). Mirrors GET /v1/speak/voices. */
export const SPEAK_VOICES = [
    "af_alloy",
    "af_aoede",
    "af_bella",
    "af_heart",
    "af_jessica",
    "af_kore",
    "af_nicole",
    "af_nova",
    "af_river",
    "af_sarah",
    "af_sky",
    "am_adam",
    "am_echo",
    "am_eric",
    "am_fenrir",
    "am_liam",
    "am_michael",
    "am_onyx",
    "am_puck",
    "am_santa",
    "bf_alice",
    "bf_emma",
    "bf_isabella",
    "bf_lily",
    "bm_daniel",
    "bm_fable",
    "bm_george",
    "bm_lewis",
] as const;

/**
 * POST /v1/speak request body — mirrors the deployed service's pydantic model.
 *
 * OUTPUT SHAPE IS FIXED to a link: the service's `output` defaults to "url" (a
 * private link valid for one hour, then deleted) and is not exposed here.
 * Its "base64" mode would inline the whole audio file into the run record
 * (~1.3 MB of text for a minute of MP3), which an agent's context should
 * never receive.
 */
export const zSpeakBody = z.object({
    text: z.string().min(1).max(MAX_SPEAK_CHARS).describe(
        "English text to speak (1-5,000 characters). Blank lines separate paragraphs.",
    ),
    voice: z.enum(SPEAK_VOICES).optional().describe(
        "Voice id: af_/am_ are American female/male, bf_/bm_ British female/male. " +
            "Default af_heart.",
    ),
    speed: z.number().min(0.5).max(2).optional().describe(
        "Speaking rate from 0.5 to 2.0 (default 1.0).",
    ),
    format: z.enum(["mp3", "opus", "wav", "flac"]).optional().describe(
        "Audio file format (default mp3).",
    ),
});
