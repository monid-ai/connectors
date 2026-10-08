import { z } from "zod";

/** POST /v1/transcribe request body — mirrors the deployed service's
 *  pydantic model (translation is disabled on the CPU deployment, so it is
 *  not exposed here). */
export const zTranscribeBody = z.object({
    url: z.url({ protocol: /^https?$/ }).max(4096).describe(
        "Direct http(s) URL of an audio or video file (not a web page). Use " +
            "the download URL from a TikTok, Instagram or Douyin video tool.",
    ),
    max_minutes: z.number().int().min(1).max(30).optional().describe(
        "Transcribe at most this many minutes of audio (1-30); billing never exceeds it.",
    ),
    language: z.string().regex(/^[A-Za-z]{2,3}$/).optional().describe(
        "Whisper language code such as 'en', 'zh', 'es', 'yue'. Omit to auto-detect.",
    ),
    include: z.array(z.enum(["segments", "words", "speakers", "srt", "vtt"]))
        .optional().describe(
            "Extra outputs: timestamped 'segments', 'words' (word-level timings), " +
                "'speakers' (beta: who spoke when, a speaker on every segment and " +
                "word plus 'turns'; +$0.0018/min; up to 20 minutes per request), " +
                "'srt' and/or 'vtt' subtitles.",
        ),
    num_speakers: z.number().int().min(1).max(10).optional().describe(
        "With 'speakers': how many people speak, if known (more accurate).",
    ),
});
