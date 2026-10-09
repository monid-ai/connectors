import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan27R2vBody } from "./schema/inputs.ts";

/**
 * Wan 2.7 reference-to-video — multi-entity character reference: reuse
 * appearance and voice from reference images / videos in a new scripted
 * scene. DashScope bills reference-video INPUT seconds (capped at 5 s) on
 * top of the output seconds, at the same rate.
 */
const zParameters = zWan27R2vBody.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Wan 2.7 Reference to Video",
        summary:
            "Generate a scene reusing characters' appearance and voice from reference media.",
        description: "Generate a new scripted scene that preserves " +
            "character appearance and voice from reference images and " +
            "video clips (up to 5 combined) with Wan 2.7 — multi-entity: " +
            "each reference can carry its own voice sample, and the prompt " +
            'addresses them by ordinal ("Image 1 walks past Video 1..."). ' +
            "Supports an optional pinned first frame, a nine-panel " +
            "storyboard image as the sole reference, negative prompts, and " +
            "prompt rewriting. Returns a downloadable MP4 video_url (24h " +
            "expiry), 2-15 seconds (2-10 with a reference video), " +
            "720P/1080P. Suited for: consistent-character series, dialogue " +
            "scenes, virtual presenters, storyboard-to-video.",
        categories: ["video-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/wan-video-to-video-api-reference",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); DashScope enforces each with a free rejection. */
        notes: [
            "At least one reference_image or reference_video; images + " +
            "videos at most 5 combined; at most one first_frame.",
            "With a reference_video the duration must be 2-10 seconds.",
            "parameters.ratio is ignored when a first_frame is provided " +
            "(the output follows that image).",
            "Billed seconds = output seconds + reference-video input " +
            "seconds, the input side capped at 5 s; the estimate holds " +
            "the requested OUTPUT seconds only.",
            "Generation typically takes 1-5 minutes; long or complex " +
            "requests can take 15+ minutes.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/video/wan2.7-r2v",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/video-generation/video-synthesis",
        headers: { "X-DashScope-Async": "enable" },
    },
    input: {
        schema: {
            // Price selectors at the BINDING (D25), `parameters` prefaulted
            // (kling D8); 720P is v1's deliberate default (design D8).
            body: zWan27R2vBody.extend({
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
                model: "wan2.7-r2v",
            }),
        }),
    },
    usage: {
        /** The VENDOR's rate card (design D5): Singapore list price per
         *  second by resolution (model-pricing page, 2026-09-16); input and
         *  output seconds bill at the same rate, so one line per
         *  resolution covers both (the minimax H3 posture). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720P seconds",
                    description:
                        "US$0.10 per billed second at 720P, input and output",
                    consumes: { credit: "default", amount: 0.1 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080P seconds",
                    description:
                        "US$0.15 per billed second at 1080P, input and output",
                    consumes: { credit: "default", amount: 0.15 },
                },
            },
        },
        /** The hold covers the requested OUTPUT seconds (v1 decision A1:
         *  the reference clip's length is unknowable before the run). */
        estimate: ({ data }) => {
            const p = data.input.body.parameters;
            return { counts: { [p.resolution.toLowerCase()]: p.duration } };
        },
        /** Settle on `output_video_duration + min(input_video_duration, 5)`
         *  — DashScope documents a 5 s cap on the billed input side, so
         *  the sum is derived from the component fields rather than
         *  trusting `usage.duration`, and a reported-but-uncapped sum can
         *  never overcharge (v1 `wanBilledSeconds`; drill T3 2026-09-01
         *  found the vendor caps its echo too — a no-op fuse). Falls back
         *  to `usage.duration` when the components are absent. Keyed from
         *  the REQUEST (design D5). */
        evidence: ({ data, utils, logger }) => {
            const output = utils.json.optionalNum(
                data.output,
                "$.usage.output_video_duration",
            );
            const input = utils.json.optionalNum(
                data.output,
                "$.usage.input_video_duration",
            );
            const total = utils.json.optionalNum(
                data.output,
                "$.usage.duration",
            );
            const seconds = output !== undefined && input !== undefined
                ? output + Math.min(input, 5)
                : total;
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
