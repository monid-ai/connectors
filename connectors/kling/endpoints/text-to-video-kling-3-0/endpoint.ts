import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTextToVideoKling30Body } from "./schema/inputs.ts";

/**
 * Kling 3.0 text-to-video — the flagship tier: native 4K, optional
 * synchronized audio, up to six storyboard shots in one clip, any 3-15 s
 * length. The async machinery (lifecycle, consolidate, credit pool) is
 * inherited from the provider; what lives here is this model's identity,
 * capability surface and rate card.
 */
const zSettings = zTextToVideoKling30Body.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 3.0 Text to Video",
        summary:
            "Generate 3-15s video from text — 4K, native audio, multi-shot; audio and 4K raise the per-second rate.",
        description: "Turn a text prompt into a 3-15 second video at " +
            "720p/1080p/4k with Kling 3.0. Strengths: the flagship tier — " +
            "native 4K, optional synchronized audio, up to six storyboard " +
            "shots in one clip, any 3-15 s length. Limits: audio raises " +
            "the rate (0.9/1.2 vs 0.6/0.8 units/s), 4K costs 3 units/s, " +
            "and generation is slower than Turbo. Returns outputs[].url " +
            "(MP4, 30-day link) with the generated duration. Supports " +
            "aspect ratios 16:9, 9:16, 1:1, multi-shot storyboard prompts " +
            "(up to 6 shots), optional native audio. Suited for: " +
            "short-form social clips, ads and product b-roll, storyboards, " +
            "concept previews.",
        categories: ["video-generation"],
        docsUrl:
            "https://kling.ai/document-api/api/video/3-0-omni/text-to-video",
        notes: [
            "4K bills 3 units per second with or without native audio — " +
            "five times the silent 720p rate.",
        ],
    },
    request: { method: "POST", path: "/text-to-video/kling-3.0" },
    input: {
        schema: {
            // Vendor defaults applied at the BINDING (D25 — the mirror stays
            // optionality-only). `settings` is prefaulted to {} so its three
            // price selectors materialize even when the caller sends none:
            // the estimate reads them directly, so the hold has to be
            // deducible from the input alone (D24).
            body: zTextToVideoKling30Body.extend({
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
        /** The VENDOR's rate card (design D5): Kling prices per second by
         *  resolution AND by native audio. Selection is a COUNTING rule —
         *  the fns below put the seconds on the one line that applies —
         *  never a model shape (D19). Amounts are the published
         *  units-per-second (pricing/base/video, 2026-09-16; drilled
         *  2026-09-08 in v1). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.6 units per second, no native audio",
                    consumes: { credit: "default", amount: 0.6 },
                },
                "720p_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p + native audio seconds",
                    description: "0.9 units per second with native audio",
                    consumes: { credit: "default", amount: 0.9 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "0.8 units per second, no native audio",
                    consumes: { credit: "default", amount: 0.8 },
                },
                "1080p_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p + native audio seconds",
                    description: "1.2 units per second with native audio",
                    consumes: { credit: "default", amount: 1.2 },
                },
                "4k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "4K seconds",
                    description: "3 units per second, no native audio",
                    consumes: { credit: "default", amount: 3 },
                },
                "4k_native_audio": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "4K + native audio seconds",
                    description: "3 units per second with native audio",
                    consumes: { credit: "default", amount: 3 },
                },
            },
        },
        /** Kling bills the REQUESTED duration in whole seconds, so the hold
         *  is exactly `duration` on the line the request selects (D8). */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            const key = s.audio === "native"
                ? s.resolution + "_native_audio"
                : s.resolution;
            return { counts: { [key]: s.duration } };
        },
        /** Settle on the vendor's OWN meter — the generated seconds summed
         *  over `outputs[].duration` (a decimal string, "5.041") and ROUNDED
         *  to whole seconds, the basis Kling bills (v1 drill 2026-09-08) —
         *  but keyed from the REQUEST (design D5): the poll body echoes no
         *  settings, and the input cannot drift. */
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
                // Succeeded without a measurable video — a vendor anomaly.
                // Zero-billed (the basis is missing), said out loud.
                logger.warn(
                    "kling task settled without a video duration — zero-billing",
                );
                return { counts: {} };
            }
            const s = data.input.body.settings;
            const key = s.audio === "native"
                ? s.resolution + "_native_audio"
                : s.resolution;
            return { counts: { [key]: seconds } };
        },
    },
});
