import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTextToVideoKling25TurboBody } from "./schema/inputs.ts";

/**
 * Kling 2.5 Turbo text-to-video — the cheapest Kling tier (0.3/0.5
 * units/s). Silent only, 5 or 10 s only, no 4K.
 */
const zSettings = zTextToVideoKling25TurboBody.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 2.5 Turbo Text to Video",
        summary:
            "Generate 5s or 10s silent video from text at the lowest rate; no audio, no 4K.",
        description: "Turn a text prompt into a 5- or 10-second video at " +
            "720p/1080p with Kling 2.5 Turbo. Strengths: the cheapest " +
            "Kling tier (0.3/0.5 units/s). Limits: silent only, 5 or 10 s " +
            "only, no 4K. Returns outputs[].url (MP4, 30-day link) with " +
            "the generated duration. Supports aspect ratios 16:9, 9:16, " +
            "1:1. Suited for: short-form social clips, ads and product " +
            "b-roll, storyboards, concept previews.",
        categories: ["video-generation"],
        docsUrl:
            "https://kling.ai/document-api/api/video/2-5-turbo/text-to-video",
    },
    request: { method: "POST", path: "/text-to-video/kling-2.5-turbo" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // both price selectors materialize (D24).
            body: zTextToVideoKling25TurboBody.extend({
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
