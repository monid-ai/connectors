import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zImageToVideoKling25TurboBody } from "./schema/inputs.ts";

/**
 * Kling 2.5 Turbo image-to-video — animate a first (and last) frame at the
 * cheapest Kling rate. Silent only, 5 or 10 s only, no 4K.
 */
const zSettings = zImageToVideoKling25TurboBody.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 2.5 Turbo Image to Video",
        summary:
            "Animate a first (and last) frame into 5s or 10s silent video at the lowest rate; last frame needs 1080p.",
        description: "Animate a still image (first or first+last frame) " +
            "into a 5- or 10-second video at 720p/1080p with Kling 2.5 " +
            "Turbo, guided by a text prompt. Strengths: the cheapest Kling " +
            "tier (0.3/0.5 units/s) with first-and-last-frame control at " +
            "1080p. Limits: silent only, 5 or 10 s only, last frame needs " +
            "1080p, no 4K. Returns outputs[].url (MP4, 30-day link) with " +
            "the generated duration; the output keeps the image's aspect " +
            "ratio. Suited for: product shots to motion, character " +
            "animation, photo-to-clip social content, keyframe-driven " +
            "transitions.",
        categories: ["video-generation"],
        docsUrl:
            // the only i2v page Kling publishes for 2.5 Turbo is the legacy
            // reference (Google-index verified, PR review 2026-09-17)
            "https://kling.ai/document-api/api/video/2-5-turbo" +
            "/image-to-video/legacy",
        /** CROSS-field rules the compiled JSON Schema cannot express, which
         *  Kling enforces itself with a free rejection (design D9). */
        notes: [
            "At most one first_frame and one last_frame; a last_frame " +
            "requires a first_frame (last-frame-only is not supported) " +
            "and requires settings.resolution 1080p.",
        ],
    },
    request: { method: "POST", path: "/image-to-video/kling-2.5-turbo" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // both price selectors materialize (D24).
            body: zImageToVideoKling25TurboBody.extend({
                settings: zSettings.extend({
                    resolution: zSettings.shape.resolution.unwrap()
                        .default("720p"),
                    duration: zSettings.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): per second by resolution
         *  (pricing/base/video, 2026-09-16). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.3 units per second",
                    consumes: { credit: "default", amount: 0.3 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "0.5 units per second",
                    consumes: { credit: "default", amount: 0.5 },
                },
            },
        },
        /** Kling bills the REQUESTED duration in whole seconds (D8). */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            return { counts: { [s.resolution]: s.duration } };
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
            return { counts: { [s.resolution]: seconds } };
        },
    },
});
