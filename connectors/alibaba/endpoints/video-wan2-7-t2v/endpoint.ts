import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan27T2vBody } from "./schema/inputs.ts";

/**
 * Wan 2.7 text-to-video — cinematic multi-shot clips with synchronized
 * audio (automatic dubbing, or a driving audio file). The async machinery
 * is inherited from the provider; this file is the model's identity,
 * capability surface and rate card.
 */
const zParameters = zWan27T2vBody.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Wan 2.7 Text to Video",
        summary:
            "Generate a 2-15s multi-shot video with audio from a text prompt.",
        description: "Turn a text prompt into a cinematic video with " +
            "synchronized audio — automatic dubbing (music and sound " +
            "effects matched to the scene) or a supplied driving audio " +
            "file for lip-synced speech and song — with Wan 2.7. Supports " +
            "multi-shot narratives described with timestamps in the " +
            "prompt, negative prompts, five aspect ratios, and prompt " +
            "rewriting. Returns a downloadable MP4 video_url (24h expiry), " +
            "2-15 seconds, 720P/1080P at 30 fps. Suited for: TikTok/Reels/" +
            "Shorts clips, ads and marketing b-roll, storyboarding, music " +
            "videos.",
        categories: ["video-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference",
        notes: [
            "Billed per second of OUTPUT video at the selected resolution; " +
            "a driving audio input is free.",
            "Generation typically takes 1-5 minutes; long or complex " +
            "requests can take 15+ minutes.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/video/wan2.7-t2v",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/video-generation/video-synthesis",
        headers: { "X-DashScope-Async": "enable" },
    },
    input: {
        schema: {
            // Price selectors at the BINDING (D25), `parameters` prefaulted
            // (kling D8); 720P is v1's deliberate default (design D8).
            body: zWan27T2vBody.extend({
                parameters: zParameters.extend({
                    resolution: zParameters.shape.resolution.unwrap()
                        .default("720P"),
                    duration: zParameters.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
        /** Inject the pinned model id (design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "wan2.7-t2v",
            }),
        }),
    },
    usage: {
        /** The VENDOR's rate card (design D5): Singapore list price per
         *  second by resolution (model-pricing page, 2026-09-16). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720P seconds",
                    description: "US$0.10 per billed second at 720P",
                    consumes: { credit: "default", amount: 0.1 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080P seconds",
                    description: "US$0.15 per billed second at 1080P",
                    consumes: { credit: "default", amount: 0.15 },
                },
            },
        },
        /** DashScope bills the requested output seconds (D8). */
        estimate: ({ data }) => {
            const p = data.input.body.parameters;
            return { counts: { [p.resolution.toLowerCase()]: p.duration } };
        },
        /** Settle on the vendor's OWN meter — `usage.duration`, the field
         *  DashScope documents as the billing figure — keyed from the
         *  REQUEST (design D5). The engine's fold rounds a fractional count
         *  UP to the next whole second (owner decision, design D4). */
        evidence: ({ data, utils, logger }) => {
            const seconds = utils.json.optionalNum(
                data.output,
                "$.usage.duration",
            );
            if (seconds === undefined || seconds <= 0) {
                logger.warn(
                    "dashscope task settled without usage.duration — zero-billing",
                );
                return { counts: {} };
            }
            const p = data.input.body.parameters;
            return { counts: { [p.resolution.toLowerCase()]: seconds } };
        },
    },
});
