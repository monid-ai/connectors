import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan27I2vBody } from "./schema/inputs.ts";

/**
 * Wan 2.7 image-to-video — first-frame / first-and-last-frame animation
 * and video continuation with synchronized audio. Same rate card as 2.7
 * text-to-video.
 */
const zParameters = zWan27I2vBody.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Wan 2.7 Image to Video",
        summary:
            "Animate a first frame, bridge two frames, or continue a video clip, with audio.",
        description: "Animate a still image into a video (first_frame), " +
            "bridge between an opening and closing image (first_frame + " +
            "last_frame), or continue an existing 2-10 s clip " +
            "(first_clip), optionally driven by an audio file for lip-sync " +
            "and timing, with Wan 2.7. Supports negative prompts and " +
            "prompt rewriting; the output aspect ratio follows the input " +
            "material. Returns a downloadable MP4 video_url (24h expiry), " +
            "2-15 seconds total, 720P/1080P at 30 fps. Suited for: " +
            "animating photos and artwork, cinematic shots from a single " +
            "still, extending existing footage, talking-head clips.",
        categories: ["video-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/image-to-video-general-api-reference",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); DashScope enforces each with a free rejection. */
        notes: [
            "Exactly one of first_frame or first_clip; each media type at " +
            "most once; driving_audio only alongside a first_frame, not " +
            "with a first_clip.",
            "Continuation outputs INCLUDE the source clip (duration bounds " +
            "the total), so a 15 s continuation of a 3 s clip bills 15 " +
            "seconds.",
            "Generation typically takes 1-5 minutes; long or complex " +
            "requests can take 15+ minutes.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/video/wan2.7-i2v",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/video-generation/video-synthesis",
        headers: { "X-DashScope-Async": "enable" },
    },
    input: {
        schema: {
            // Price selectors at the BINDING (D25), `parameters` prefaulted
            // (kling D8); 720P is v1's deliberate default (design D8).
            body: zWan27I2vBody.extend({
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
                model: "wan2.7-i2v",
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
