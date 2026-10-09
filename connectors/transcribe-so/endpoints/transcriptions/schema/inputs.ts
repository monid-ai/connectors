import { z } from "zod";

/**
 * The connector input for `POST /transcriptions` — a DELIBERATE monid shape,
 * not the vendor mirror: transcribe.so's create body is
 * `{source, url, duration_seconds?, language?, max_charge_usd?}` where
 * `source` is a type the caller must classify (`youtube` | `platform_url` |
 * `external_url`). Here the caller states only the URL and the lifecycle
 * derives `source` from its host; `formats` is connector-only and governs
 * which artifacts the run fetches after completion. Optionality only (D25);
 * defaults and the `max_charge_usd` requirement live at the binding.
 *
 * Published contract (read 2026-09-26): `url` http(s), max 2048 chars,
 * public and reachable without login; `duration_seconds` advisory for URL
 * sources (the server probes when omitted); `language` BCP-47 or "auto";
 * `max_charge_usd` a positive dollar ceiling.
 */
export const zTranscriptionsBody = z.object({
    url: z
        .string()
        .min(1)
        .max(2048)
        .regex(/^https?:\/\/\S+$/)
        .describe(
            "Public media URL to transcribe: a YouTube video, an Apple " +
                "Podcasts / Spotify episode, a SoundCloud track, a Vimeo, " +
                "Twitch VOD or Loom link, or a direct mp3/mp4/m4a URL " +
                "(Google Drive / Dropbox share links work). http(s) only, " +
                "max 2048 characters, must be reachable without login.",
        ),
    duration_seconds: z
        .number()
        .int()
        .min(1)
        .max(43_200)
        .describe(
            "Media duration in whole seconds, if known. Advisory: the " +
                "server probes the real length when omitted (a little " +
                "slower). Billing always follows the real duration.",
        )
        .optional(),
    language: z
        .string()
        .min(2)
        .max(35)
        .describe(
            'Spoken language as a BCP-47 tag ("en", "ko", "pt-BR") or ' +
                '"auto" to detect it. Default "auto".',
        )
        .optional(),
    max_charge_usd: z
        .number()
        .positive()
        .describe(
            "Hard ceiling on this job's charge in US dollars, checked " +
                "before anything is held: a job priced above it is refused " +
                "with 402 max_charge_exceeded and costs nothing. Retail is " +
                "US$1 per audio hour ($0.016667 per whole minute, minimum " +
                "1 minute), so 1 hour of audio needs at least 1.0.",
        )
        .optional(),
    formats: z
        .array(z.enum(["markdown", "srt", "vtt"]))
        .min(1)
        .max(3)
        .describe(
            "Artifacts to return. markdown (always fetched) is the " +
                "speaker-labelled, timestamped transcript with chapters; " +
                'add "srt" and/or "vtt" for subtitle files. Default ' +
                '["markdown"].',
        )
        .optional(),
}).strict();
