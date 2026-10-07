import { z } from "zod";

/**
 * The detect-media body: one public media URL. The platform infers whether
 * it is an image, video, audio stream, or document from the content itself —
 * the caller names no media type. `.regex()`, not `.refine()`: a regex
 * compiles to a JSON Schema `pattern` the engine enforces; a refinement is
 * silently dropped.
 */
export const zDetectBody = z.object({
    url: z.string()
        .regex(/^https:\/\/\S+$/, "must be a public https:// URL")
        .describe(
            "A public https:// URL of the image, video, audio, or document " +
                "to score (inline base64 is not accepted).",
        ),
}).strict();
