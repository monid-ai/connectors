import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTextToVideoKling26Body } from "./schema/inputs.ts";

/**
 * Kling 2.6 text-to-video — silent clips at 0.3/0.5 units/s (720p/1080p,
 * versus 0.6/0.8 on 3.0), native audio at 1080p for 1 unit/s. 5 or 10 s
 * only.
 */
const zSettings = zTextToVideoKling26Body.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 2.6 Text to Video",
        summary:
            "Generate 5s or 10s video from text at 0.3/0.5 units/s silent (720p/1080p); native audio only at 1080p, no 4K.",
        description: "Turn a text prompt into a 5- or 10-second video at " +
            "720p/1080p with Kling 2.6. Strengths: silent clips at 0.3/0.5 " +
            "units/s (720p/1080p, versus 0.6/0.8 on 3.0) and native audio " +
            "at 1080p for 1 unit/s. Limits: 5 or 10 s only, 720p is silent only " +
            "(native audio requires 1080p), no 4K, no multi-shot. Returns " +
            "outputs[].url (MP4, 30-day link) with the generated duration. " +
            "Supports aspect ratios 16:9, 9:16, 1:1, optional native " +
            "audio. Suited for: short-form social clips, ads and product " +
            "b-roll, storyboards, concept previews.",
        categories: ["video-generation"],
        docsUrl: "https://kling.ai/document-api/api/video/2-6/text-to-video",
        /** The one CROSS-field rule Kling enforces on 2.6, which the
         *  compiled JSON Schema cannot express (design D9). */
        notes: [
            "settings.audio native requires settings.resolution 1080p — " +
            "720p with native audio is rejected upstream (free).",
        ],
    },
    request: { method: "POST", path: "/text-to-video/kling-2.6" },
    input: {
        schema: {
            // Vendor defaults at the BINDING (D25); `settings` prefaulted so
            // the three price selectors materialize (D24).
            body: zTextToVideoKling26Body.extend({
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
        /** The VENDOR's rate card (design D5): per second by resolution,
         *  plus the one native-audio line Kling publishes (1080p only;
         *  pricing/base/video, 2026-09-16).
         *  Kling also lists a "native audio with voice control" 1080p row
         *  at 1.2 units/s; it needs a `voice` content item (an account-level
         *  asset this connector does not expose), so it has no line here. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.3 units per second, no native audio",
                    consumes: { credit: "default", amount: 0.3 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "0.5 units per second, no native audio",
                    consumes: { credit: "default", amount: 0.5 },
                },
                "1080p_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p + native audio seconds",
                    description: "1 unit per second with native audio",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        /** Kling bills the REQUESTED duration in whole seconds (D8). A
         *  720p + native request has no published rate — Kling rejects it
         *  for free — so it estimates on the silent 720p line. */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            const key = s.audio === "native" && s.resolution === "1080p"
                ? "1080p_native_audio"
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
            const key = s.audio === "native" && s.resolution === "1080p"
                ? "1080p_native_audio"
                : s.resolution;
            return { counts: { [key]: seconds } };
        },
    },
});
