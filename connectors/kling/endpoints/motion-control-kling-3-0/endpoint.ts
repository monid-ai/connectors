import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMotionControlKling30Body } from "./schema/inputs.ts";

/**
 * Kling 3.0 motion control — a character image performs the motion of a
 * reference video, at the highest motion fidelity. No `duration`: the
 * output follows the reference clip, so the ESTIMATE reserves the
 * `character_orientation` ceiling (30 s for video, 10 s for image) and the
 * run settles on the generated seconds (design D8; v1 drill 2026-09-08: a
 * 3.033 s output billed 3).
 */
const zSettings = zMotionControlKling30Body.shape.settings.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Kling 3.0 Motion Control",
        summary:
            "Make a character image perform a reference video's motion with top fidelity; needs a clean single-person clip, no 4K.",
        description: "Animate a character image with the body motion of a " +
            "reference video (3-30 s, one person, single take), keeping " +
            "the character's look and optionally the clip's original " +
            "audio, at 720p/1080p with Kling 3.0. Strengths: the 3.0 " +
            "motion model — the highest motion fidelity and character " +
            "consistency, original audio kept. Limits: 0.9/1.2 units/s, " +
            "no 4K, needs a clean single-person reference clip and the " +
            "output can be shorter than it. Returns outputs[].url (MP4, " +
            "30-day link) with the generated duration, which follows the " +
            "usable motion in the reference (and may be shorter). " +
            "Supports character_orientation to follow the image or the " +
            "video framing. Suited for: dance and performance transfer, " +
            "character animation from a single photo, avatar motion clips.",
        categories: ["video-generation"],
        docsUrl:
            "https://kling.ai/document-api/api/video/3-0-omni/motion-control",
        notes: [
            "No duration input: the output length follows the reference " +
            "clip (up to 30 s with character_orientation video, 10 s with " +
            "image); the estimate reserves that ceiling and the run " +
            "settles on the generated seconds.",
            "Exactly one image item and one video item per request.",
            "If only part of the reference motion is usable the output is " +
            "shorter than the clip (at least 3 s of continuous motion is " +
            "needed); a clip without a complete upper body fails the " +
            "task, which bills nothing.",
        ],
    },
    request: { method: "POST", path: "/motion-control/kling-3.0" },
    input: {
        schema: {
            // `settings` is REQUIRED at the binding: character_orientation
            // has no vendor default and the estimate reads it (D24).
            // `resolution` takes Kling's default here (D25).
            body: zMotionControlKling30Body.extend({
                settings: zSettings.extend({
                    resolution: zSettings.shape.resolution.unwrap()
                        .default("720p"),
                }),
            }),
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): per second by resolution
         *  (pricing/base/video, 2026-09-16, "Kling 3.0 · Motion Control"). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "0.9 units per second of output video",
                    consumes: { credit: "default", amount: 0.9 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "1.2 units per second of output video",
                    consumes: { credit: "default", amount: 1.2 },
                },
            },
        },
        /** No requested duration to deduce from, so the hold is the
         *  reference-clip ceiling the orientation implies (v1
         *  `motionHoldSeconds`): worst case, released at settle. */
        estimate: ({ data }) => {
            const s = data.input.body.settings;
            const seconds = s.character_orientation === "image" ? 10 : 30;
            return { counts: { [s.resolution]: seconds } };
        },
        /** The generated seconds off `outputs[].duration`, rounded — the
         *  basis Kling bills for motion control (v1 drill 2026-09-08) —
         *  keyed from the REQUEST (design D5). */
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
