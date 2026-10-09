import { z } from "zod";

/**
 * Shared vendor-mirror fragments for the Alibaba Model Studio (DashScope)
 * family — ported from v1 `endpoints/common.ts` (the zod pieces only; v1's
 * flat-input → wire assembly died with design D2, the body IS DashScope's
 * `{input, parameters}` envelope and `model` is injected at the wire).
 *
 * Every `.describe()` sits on the fragment BEFORE the `.optional()` each
 * endpoint applies, so a binding `.unwrap()` keeps it.
 */

/**
 * A media URL: public `https://` only. DashScope also accepts inline base64
 * (`data:` URLs up to 20 MB) and Asset Center `asset_id`s — refused here:
 * base64 would blow the run record, and Asset Center assets are
 * account-level (a cross-tenant surface; v1 scope). `.regex()` compiles to
 * a JSON Schema `pattern` the engine enforces; a `.refine()` would not.
 */
export const zMediaUrl = z
    .string()
    .regex(/^https:\/\/\S+$/, "must be a public https:// URL")
    .describe(
        "A public https:// URL (inline base64 and Asset Center ids are not " +
            "accepted).",
    );

/** `parameters.seed` — the range every DashScope generation model shares. */
export const zSeed = z
    .number()
    .int()
    .min(0)
    .max(2147483647)
    .describe(
        "Random seed for reproducibility (0-2147483647). The same seed " +
            "does not guarantee identical results.",
    );

export const zPromptExtend = z
    .boolean()
    .describe(
        "Rewrite the prompt with an LLM to improve quality (best for short " +
            "prompts; adds latency). DashScope defaults to true.",
    );

export const zWatermark = z
    .boolean()
    .describe(
        'Add an "AI Generated" watermark in the lower-right corner. ' +
            "DashScope defaults to false.",
    );

export const zNegativePrompt = z
    .string()
    .max(500)
    .describe(
        "Elements to exclude from the video (max 500 characters; longer " +
            "text is truncated upstream).",
    );

/** `parameters.resolution` — a PRICE SELECTOR on every video endpoint. */
export function zResolution<const T extends readonly [string, ...string[]]>(
    values: T,
) {
    return z
        .enum(values)
        .describe(
            `Output resolution tier (${values.join(" | ")}). Selects the ` +
                "per-second rate. DashScope defaults to 1080P; this doc " +
                "defaults to 720P.",
        );
}

/** The five fixed aspect ratios of the Wan 2.7 video models. */
export const zWanRatio = z
    .enum(["16:9", "9:16", "1:1", "4:3", "3:4"])
    .describe("Aspect ratio (width:height) of the output video.");

/**
 * `input.messages` of the blocking multimodal image path: exactly ONE user
 * message whose `content[]` mixes `{image}` references and `{text}` — the
 * DashScope shape every image model shares. `maxImages` and the two
 * describes are the model's own facts.
 */
export function zImageMessages(
    maxImages: number,
    textDescribe: string,
    imageDescribe: string,
) {
    return z
        .array(
            z.object({
                role: z
                    .literal("user")
                    .describe(
                        "Single-turn only: the one message is the user's.",
                    ),
                content: z
                    .array(
                        z.union([
                            z.object({
                                text: z.string().min(1).describe(textDescribe),
                            }).strict(),
                            z.object({
                                image: zMediaUrl.describe(imageDescribe),
                            }).strict(),
                        ]),
                    )
                    .min(1)
                    .max(maxImages + 1)
                    .describe(
                        `Exactly one {text} item plus 0-${maxImages} {image} ` +
                            "items, in reference order.",
                    ),
            }).strict(),
        )
        .length(1)
        .describe("Exactly one user message (single-turn).");
}
