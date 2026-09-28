import { z } from "zod";

/**
 * `POST /api/stealthify` body: mirror of the published `StealthifyRequest`
 * (optionality only; vendor defaults are applied at the binding). Strict.
 * Not exposed: `business` (removed, no effect), `detector` (deprecated, no
 * effect), `mode` (deprecated).
 */
export const zStealthifyBody = z.strictObject({
    prompt: z.string().min(1).describe(
        "With `rephrase: true`, the text to humanize (source text only, no " +
            "instructions). With `rephrase: false`, the topic or " +
            "instructions for generation. Maximum 3,000 words.",
    ),
    rephrase: z.boolean().describe(
        "`true` rephrases `prompt`; `false` generates new content from it.",
    ),
    model: z.enum(["super", "standard", "lite", "heavy"]).describe(
        "Required. `super`: flagship humanizer, $0.05 per 100 words. " +
            "`standard`: full rewrite, $0.20 per 1,000 words. `lite`: fast " +
            "light cleanup, not designed to bypass detectors, $0.20 per " +
            "1,000 words. `heavy`: deprecated alias of `standard`.",
    ),
    tone: z.enum(["Standard", "HighSchool", "College", "PhD"]).describe(
        "Style and complexity of generated essays. Ignored when `rephrase` " +
            "is true or `writingMode` is `default`.",
    ).optional(),
    writingMode: z.enum(["default", "essay"]).describe(
        "`essay` structures generated content as an academic essay; " +
            "`default` follows the prompt as written. No effect when " +
            "`rephrase` is true.",
    ).optional(),
    qualityMode: z.enum(["fast", "quality"]).describe(
        "`quality` runs quality checks and repairs; `fast` is a single-pass " +
            "rewrite.",
    ).optional(),
    isMultilingual: z.boolean().describe(
        "`true` keeps non-English input in its language; `false` returns " +
            "it in English.",
    ).optional(),
    outputFormat: z.enum(["text", "markdown"]).describe(
        "`text` returns plain text; `markdown` returns markdown.",
    ).optional(),
});
