import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOmniVideoKling30OmniBody } from "./schema/inputs.ts";

/**
 * Kling 3.0 Omni — the all-in-one 3.0 tier: reference images, a feature
 * video or a base video to edit, native or original audio, 4K, multi-shot,
 * 3-15 s. The "with video input" price dimension is derived from the
 * contents[] the caller sends, so the rate line is chosen from the REQUEST
 * (design D5) — v1 had to stash it at submit and stamp the poll body.
 */
const zSettings = zOmniVideoKling30OmniBody.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 3.0 Omni Video",
        summary:
            "Generate or edit 3-15s video from a prompt plus reference images and one video, up to 4K; a video input raises the rate.",
        description: "Generate video from any mix of a text prompt, " +
            "reference images, pinned first/last frames, a " +
            "feature-reference video (borrow motion or style) or a base " +
            "video to edit (change subjects, style, weather, camera) in " +
            "one request, 3-15 seconds at 720p/1080p/4k with Kling 3.0 " +
            "Omni. Strengths: the all-in-one 3.0 tier — reference images, " +
            "a feature video or a base video to edit, native or original " +
            "audio, 4K, multi-shot, 3-15 s. Limits: the strictest input " +
            "grammar (image/video count rules), a video input raises the " +
            "rate (0.9/1.2 units/s), and a base video cannot combine with " +
            "frames, multi-shot or native audio. Returns outputs[].url " +
            "(MP4, 30-day link) with the generated duration. Supports " +
            "@handles to name media in the prompt, multi-shot " +
            "storyboards, original-audio passthrough. Suited for: video " +
            "editing and restyling, character-consistent scenes, " +
            "reference-driven ads, storyboard-to-video.",
        categories: ["video-generation"],
        docsUrl: "https://kling.ai/document-api/api/video/3-0-omni/video-omni",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9). Kling enforces each with a free rejection; the one that is
         *  silently wrong rather than an error — multi_shot with a base
         *  video — earns the explicit instruction. */
        notes: [
            "A video input (feature_video or base_video) selects the " +
            "with-video rate line and cannot combine with settings.audio " +
            "native — use original or off.",
            "At most one video per request. With a feature_video, " +
            "multi-shot prompts are supported and settings.multi_shot " +
            "must stay true.",
            "base_video (the clip to edit) cannot combine with a " +
            "first_frame or last_frame, with multi-shot, or with native " +
            "audio — pass settings.multi_shot false (Kling's default is " +
            "true).",
            "At most one first_frame and one last_frame; a last_frame " +
            "requires a first_frame. refer_image: up to 7 without a " +
            "video input, 4 with one.",
            "settings.aspect_ratio applies only when there is neither a " +
            "first_frame nor a video input; with a first_frame or " +
            "base_video the output follows that input.",
            "Media ids must be unique within the request.",
            "4K bills 3 units per second regardless of audio or video " +
            "input — five times the silent 720p rate.",
        ],
    },
    request: { method: "POST", path: "/omni-video/kling-3.0-omni" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // the three price selectors materialize (D24).
            body: zOmniVideoKling30OmniBody.extend({
                settings: zSettings.extend({
                    audio: zSettings.shape.audio.unwrap().default("off"),
                    resolution: zSettings.shape.resolution.unwrap()
                        .default("720p"),
                    duration: zSettings.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): per second by resolution ×
         *  (no video input × audio, with video input). Kling publishes
         *  three 4K rows, all 3 units/s (pricing/base/video, 2026-09-16). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description:
                        "0.6 units per second, no video input, no native audio",
                    consumes: { credit: "default", amount: 0.6 },
                },
                "720p_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p + native audio seconds",
                    description:
                        "0.8 units per second, no video input, native audio",
                    consumes: { credit: "default", amount: 0.8 },
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
                    description:
                        "0.8 units per second, no video input, no native audio",
                    consumes: { credit: "default", amount: 0.8 },
                },
                "1080p_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p + native audio seconds",
                    description:
                        "1 unit per second, no video input, native audio",
                    consumes: { credit: "default", amount: 1 },
                },
                "1080p_with_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p + video input seconds",
                    description: "1.2 units per second with a video input",
                    consumes: { credit: "default", amount: 1.2 },
                },
                "4k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "4K seconds",
                    description:
                        "3 units per second, no video input, no native audio",
                    consumes: { credit: "default", amount: 3 },
                },
                "4k_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "4K + native audio seconds",
                    description:
                        "3 units per second, no video input, native audio",
                    consumes: { credit: "default", amount: 3 },
                },
                "4k_with_video": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "4K + video input seconds",
                    description: "3 units per second with a video input",
                    consumes: { credit: "default", amount: 3 },
                },
            },
        },
        /** Kling bills the REQUESTED duration in whole seconds (D8). The
         *  line follows the request: a video input wins over the audio
         *  switch (native audio is not offered with a video, and Kling
         *  rejects the pair for free). */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            const withVideo = data.input.body.contents.some((item) =>
                item.type === "feature_video" || item.type === "base_video"
            );
            const key = withVideo
                ? s.resolution + "_with_video"
                : s.audio === "native"
                ? s.resolution + "_native_audio"
                : s.resolution;
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
            const key = withVideo
                ? s.resolution + "_with_video"
                : s.audio === "native"
                ? s.resolution + "_native_audio"
                : s.resolution;
            return { counts: { [key]: seconds } };
        },
    },
});
