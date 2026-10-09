import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOmniVideoKlingO1Body } from "./schema/inputs.ts";

/**
 * Kling O1 — the unified reference-driven generation and editing model at
 * 3.0-Omni-minus rates: 720p/1080p, 3-10 s, no native audio. The "with
 * video input" price dimension is derived from the contents[] the caller
 * sends, so the rate line is chosen from the REQUEST (design D5).
 */
const zSettings = zOmniVideoKlingO1Body.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling O1 Video",
        summary:
            "Generate or edit 3-10s video from a prompt plus reference images and one video at a lower rate; no 4K, no native audio.",
        description: "Generate video from any mix of a text prompt, " +
            "reference images, pinned first/last frames, a " +
            "feature-reference video (borrow motion or style) or a base " +
            "video to edit (change subjects, style, weather, camera) in " +
            "one request, 3-10 seconds at 720p/1080p with Kling O1. " +
            "Strengths: the unified O1 model — high consistency for " +
            "reference-driven generation and video editing at " +
            "3.0-Omni-minus rates (0.6/0.8, 0.9/1.2 with video). Limits: " +
            "720p/1080p only, 3-10 s, no native audio, and a lone first " +
            "frame only yields 5 or 10 s clips. Returns outputs[].url " +
            "(MP4, 30-day link) with the generated duration. Supports " +
            "@handles to name media in the prompt, original-audio " +
            "passthrough. Suited for: video editing and restyling, " +
            "character-consistent scenes, reference-driven ads, " +
            "storyboard-to-video.",
        categories: ["video-generation"],
        docsUrl: "https://kling.ai/document-api/api/video/o1/video-omni",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); Kling enforces each with a free rejection. */
        notes: [
            "A video input (feature_video or base_video) selects the " +
            "with-video rate line. At most one video per request.",
            "base_video (the clip to edit) cannot combine with a " +
            "first_frame or last_frame; feature_video allows a " +
            "first_frame but not a last_frame.",
            "At most one first_frame and one last_frame; a last_frame " +
            "requires a first_frame, and first+last frames allow no " +
            "additional refer_image. refer_image: up to 7 without a " +
            "video input, 4 with one.",
            "A first_frame with no refer_image and no video input " +
            "generates 5 or 10 seconds only — other durations are " +
            "rejected.",
            "settings.aspect_ratio applies only when there is neither a " +
            "first_frame nor a video input; with a first_frame or " +
            "base_video the output follows that input.",
            "Media ids must be unique within the request.",
        ],
    },
    request: { method: "POST", path: "/omni-video/kling-o1" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // both price selectors materialize (D24). `audio` is not a
            // selector on O1 and keeps Kling's server default.
            body: zOmniVideoKlingO1Body.extend({
                settings: zSettings.extend({
                    resolution: zSettings.shape.resolution.unwrap()
                        .default("720p"),
                    duration: zSettings.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): per second by resolution ×
         *  video input (pricing/base/video, 2026-09-16). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.6 units per second, no video input",
                    consumes: { credit: "default", amount: 0.6 },
                },
                "720p_with_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p + video input seconds",
                    description: "0.9 units per second with a video input",
                    consumes: { credit: "default", amount: 0.9 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "0.8 units per second, no video input",
                    consumes: { credit: "default", amount: 0.8 },
                },
                "1080p_with_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p + video input seconds",
                    description: "1.2 units per second with a video input",
                    consumes: { credit: "default", amount: 1.2 },
                },
            },
        },
        /** Kling bills the REQUESTED duration in whole seconds (D8); the
         *  line follows whether contents[] carries a video. */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            const withVideo = data.input.body.contents.some((item) =>
                item.type === "feature_video" || item.type === "base_video"
            );
            const key = withVideo ? s.resolution + "_with_video" : s.resolution;
            return { counts: { [key]: s.duration } };
        },
        /** The generated seconds off `outputs[].duration`, rounded — keyed
         *  from the REQUEST (design D5). */
        evidence: ({ data, utils, logger }) => {
            const outputs = utils.json.optionalGet(data.output, "$.outputs");
            let total = 0;
            if (Array.isArray(outputs)) {
                for (const o of outputs) {
                    if (
                        o === null || typeof o !== "object" ||
                        Array.isArray(o) || o.type !== "video"
                    ) continue;
                    const n = Number(o.duration);
                    if (Number.isFinite(n) && n > 0) total += n;
                }
            }
            const seconds = Math.round(total);
            if (seconds === 0) {
                logger.warn(
                    "kling task settled without a video duration — zero-billing",
                );
                return { counts: {} };
            }
            const s = data.input.body.settings;
            const withVideo = data.input.body.contents.some((item) =>
                item.type === "feature_video" || item.type === "base_video"
            );
            const key = withVideo ? s.resolution + "_with_video" : s.resolution;
            return { counts: { [key]: seconds } };
        },
    },
});
