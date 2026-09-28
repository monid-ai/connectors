import { z } from "zod";

/**
 * `POST /api/stealthify/runs` JSON body: mirror of the published
 * `StealthifyApiCreateRunRequest` (optionality only; `model` is required at
 * the binding). Strict. Not exposed: `webhookUrl` and `webhookSecret` (the
 * engine polls the run itself) and the multipart file upload.
 */
export const zHumanizeRunBody = z.strictObject({
    text: z.string().min(1).describe(
        "The text to humanize (source text only, no instructions).",
    ),
    model: z.enum(["super", "standard", "lite", "heavy"]).describe(
        "Required. `super`: flagship humanizer, $0.05 per 100 words. " +
            "`standard`: full rewrite, $0.20 per 1,000 words. `lite`: fast " +
            "light cleanup, not designed to bypass detectors, $0.20 per " +
            "1,000 words. `heavy`: deprecated alias of `standard`.",
    ).optional(),
    qualityMode: z.enum(["fast", "quality"]).describe(
        "`quality` runs quality checks and repairs; `fast` is a single-pass " +
            "rewrite.",
    ).optional(),
    outputFormat: z.enum(["text", "markdown"]).describe(
        "`text` returns plain text; `markdown` preserves markdown where " +
            "supported.",
    ).optional(),
});
