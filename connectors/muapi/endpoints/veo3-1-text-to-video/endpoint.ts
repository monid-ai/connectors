import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zVeo31TextToVideoBody } from "./schema/inputs.ts";

/** Google Veo 3.1 text-to-video through MuAPI. */
export default defineEndpoint({
    meta: {
        displayName: "MuAPI Google Veo 3.1 Text-to-Video",
        summary: "Generate an 8-second cinematic video with Google's Veo 3.1.",
        description:
            "Generate a cinematic video with Google's Veo 3.1 from a " +
            "detailed text prompt. Choose a 16:9 or 9:16 frame, the " +
            "documented 8-second duration, and 720p, 1080p, or 4K output. " +
            "Veo 3.1 is designed for realistic motion, rich audio, and " +
            "narrative control. The request is asynchronous and completes " +
            "with a video URL. MuAPI's current published prices are $2.50 " +
            "at 720p, $3.25 at 1080p, and $3.70 at 4K.",
        docsUrl: "https://muapi.ai/veo-3.1",
        categories: ["video-generation"],
    },
    request: {
        method: "POST",
        path: "/veo3.1-text-to-video",
    },
    input: {
        schema: {
            body: zVeo31TextToVideoBody.extend({
                prompt: zVeo31TextToVideoBody.shape.prompt.unwrap(),
                aspect_ratio: zVeo31TextToVideoBody.shape.aspect_ratio.unwrap()
                    .default("16:9"),
                duration: zVeo31TextToVideoBody.shape.duration.unwrap()
                    .default(8),
                resolution: zVeo31TextToVideoBody.shape.resolution.unwrap()
                    .default("720p"),
            }),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 10_000 },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "720p video",
                    description: "one 8-second Veo 3.1 video at 720p",
                    consumes: { credit: "default", amount: 2.5 },
                },
                "1080p_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "1080p video",
                    description: "one 8-second Veo 3.1 video at 1080p",
                    consumes: { credit: "default", amount: 3.25 },
                },
                "4k_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K video",
                    description: "one 8-second Veo 3.1 video at 4K",
                    consumes: { credit: "default", amount: 3.7 },
                },
            },
        },
        estimate: ({ data }) => {
            const resolution = data.input.body.resolution;
            const key = resolution === "1080p"
                ? "1080p_video"
                : resolution === "4k"
                ? "4k_video"
                : "720p_video";
            return { counts: { [key]: 1 } };
        },
        evidence: ({ data }) => {
            const resolution = data.input.body.resolution;
            const key = resolution === "1080p"
                ? "1080p_video"
                : resolution === "4k"
                ? "4k_video"
                : "720p_video";
            return { counts: { [key]: 1 } };
        },
    },
});
