import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

const zBody = z.object({
    name: z.string().optional().describe(
        "Optional project name for identifying the generated animation.",
    ),
    style: z.object({
        prompt: z.string().min(1).max(500).describe(
            "Prompt describing the animated scene to generate.",
        ),
    }).strict(),
    output_format: z.enum(["gif", "mp4", "webm"]).optional(),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI GIF Generator",
        summary:
            "Generate a GIF, MP4, or WebM animation from a text prompt for 50 Magic Hour credits.",
        description: "Create a short animated asset from a text prompt. " +
            "Choose GIF, MP4, or WebM output. The run submits an image " +
            "project, polls it to completion, and returns the project " +
            "metadata plus a temporary download URL. Each completed " +
            "generation costs 50 Magic Hour credits.",
        docsUrl:
            "https://docs.magichour.ai/api-reference/image-projects/ai-gif-generator",
        categories: ["image-generation", "video-generation"],
    },
    endpoint: "/v1/image/magic-hour-ai-gif",
    request: { method: "POST", path: "/v1/ai-gif-generator" },
    input: {
        schema: {
            body: zBody.extend({
                output_format: zBody.shape.output_format.default("gif"),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 50 },
        },
    },
});
