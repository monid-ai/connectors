import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTextToVideoKling30TurboBody } from "./schema/inputs.ts";

/**
 * Kling 3.0 Turbo text-to-video — the fast 3.0 tier: always native audio,
 * any 3-15 s length, cheaper than 3.0 with audio. No 4K, no audio switch.
 */
const zSettings = zTextToVideoKling30TurboBody.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 3.0 Turbo Text to Video",
        summary:
            "Generate 3-15s video from text fast, always with native audio; no 4K, no multi-shot switch.",
        description: "Turn a text prompt into a 3-15 second video at " +
            "720p/1080p with Kling 3.0 Turbo. Strengths: the fast 3.0 tier " +
            "— always ships native audio, any 3-15 s length, cheaper than " +
            "3.0 with audio. Limits: no 4K, no multi-shot switch, and audio " +
            "cannot be turned off. Returns outputs[].url (MP4, 30-day " +
            "link) with the generated duration. Supports aspect ratios " +
            "16:9, 9:16, 1:1. Suited for: short-form social clips, ads and " +
            "product b-roll, storyboards, concept previews.",
        categories: ["video-generation"],
        docsUrl:
            "https://kling.ai/document-api/api/video/3-0-turbo/text-to-video",
        notes: [
            "Turbo always generates native audio and is priced as such — " +
            "there is no audio switch.",
        ],
    },
    request: { method: "POST", path: "/text-to-video/kling-3.0-turbo" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // both price selectors materialize (D24).
            body: zTextToVideoKling30TurboBody.extend({
                settings: zSettings.extend({
                    resolution: zSettings.shape.resolution.unwrap()
                        .default("720p"),
                    duration: zSettings.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): per second by resolution,
         *  native audio included (pricing/base/video, 2026-09-16). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.8 units per second, native audio included",
                    consumes: { credit: "default", amount: 0.8 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "1 unit per second, native audio included",
                    consumes: { credit: "default", amount: 1 },
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
