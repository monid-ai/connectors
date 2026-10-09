import { z } from "zod";

/**
 * Shared vendor-mirror fragments for the Kling video family (ported from v1
 * `endpoints/common.ts` — the zod pieces only; v1's flat-input → wire
 * assembly died with design D2, the body IS Kling's).
 *
 * Every Kling video endpoint posts `{prompt | contents[], settings{}}` to its
 * own `/<family>/<model>` path. What differs per model is which VALUES it
 * accepts — resolutions, the duration ceiling, an audio switch, which
 * `contents[].type`s — so the STRUCTURE lives here and each endpoint's own
 * `schema/inputs.ts` composes its full body from these pieces. Every
 * `.describe()` sits on the fragment BEFORE the `.optional()` the endpoint
 * applies, so a binding `.unwrap()` keeps it (DEVELOPMENT.md authoring
 * guide).
 */

/**
 * A media URL: public `https://` only. Kling also accepts inline base64 (up
 * to 50 MB) — refused here, because a base64 body would blow the run record
 * (the bytedance `zRefUrl` posture). `.regex()`, not `.refine()`: a regex
 * compiles to a JSON Schema `pattern` the engine enforces; a refinement is
 * silently dropped.
 */
export const zMediaUrl = z
    .string()
    .regex(/^https:\/\/\S+$/, "must be a public https:// URL")
    .describe("A public https:// URL (inline base64 is not accepted).");

/** `{type: "prompt", text}` — the text item of every `contents[]` body. */
export function promptItem(maxChars: number, describe: string) {
    return z.object({
        type: z.literal("prompt"),
        text: z.string().min(1).max(maxChars).describe(describe),
    }).strict();
}

/** `settings.resolution` — a PRICE SELECTOR on every endpoint. */
export function zResolution<const T extends readonly [string, ...string[]]>(
    values: T,
) {
    return z
        .enum(values)
        .describe(
            `Output resolution (${values.join(" | ")}). Selects the ` +
                "per-second rate. Kling defaults to 720p.",
        );
}

export const zAspectRatio = z
    .enum(["16:9", "9:16", "1:1"])
    .describe(
        "Aspect ratio (width:height) of the output frames. Kling defaults " +
            "to 16:9.",
    );

/** Free-form whole seconds (the 3.0 family and O1). */
export function zDurationRange(max: number) {
    return z
        .number()
        .int()
        .min(3)
        .max(max)
        .describe(
            `Length of the output in seconds (3-${max}). Kling defaults ` +
                "to 5. Billed per second.",
        );
}

/** The fixed 5 | 10 choice (2.6 and 2.5 Turbo). */
export const zDurationChoice = z
    .literal([5, 10])
    .describe(
        "Length of the output in seconds: 5 or 10. Kling defaults to 5. " +
            "Billed per second.",
    );

/** `settings.audio` where the model prices native audio (3.0, 2.6, Omni). */
export const zNativeAudio = z
    .enum(["native", "off"])
    .describe(
        "native: generate synchronized audio, which raises the per-second " +
            "rate. off: silent. Kling defaults to off.",
    );

export const zMultiShot = z
    .boolean()
    .describe(
        'Honour multi-shot prompts written as "shot 1, 5, ...; shot 2, 3, ' +
            '..." (shot number, seconds, prompt); false renders such a ' +
            "prompt as one shot. Kling defaults to true. No price impact.",
    );
