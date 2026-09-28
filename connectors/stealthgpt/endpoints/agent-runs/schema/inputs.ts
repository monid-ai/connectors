import { z } from "zod";

/**
 * `POST /api/stealthify/agent/runs` body: mirror of the published
 * `StealthAgentApiCreateRunRequest`: a discriminated union on `preset`,
 * strict per arm, `platform` required on `social` only. Not exposed:
 * `webhookUrl` and `webhookSecret` (the engine polls the run itself).
 */
const zAgentRunFields = {
    prompt: z.string().min(1).describe(
        "Topic or instructions for the piece. Include a target length to " +
            "control cost.",
    ),
    enableFactCheck: z.boolean().describe(
        "Run a fact-check pass on the draft before humanization.",
    ).optional(),
    enableImageGeneration: z.boolean().describe(
        "Allow generated images in the final markdown where supported.",
    ).optional(),
};

export const zAgentRunBody = z.discriminatedUnion("preset", [
    z.strictObject({
        preset: z.literal("academic").describe(
            "Essays, literature reviews and research-style writing with " +
                "citations.",
        ),
        ...zAgentRunFields,
    }),
    z.strictObject({
        preset: z.literal("seo").describe(
            "Long-form blog posts, guides and landing pages with SEO " +
                "structure.",
        ),
        ...zAgentRunFields,
    }),
    z.strictObject({
        preset: z.literal("social").describe(
            "LinkedIn or Medium posts in the platform's voice.",
        ),
        platform: z.enum(["linkedin", "medium"]).describe(
            "Target platform. Required with `social`.",
        ),
        ...zAgentRunFields,
    }),
]);
