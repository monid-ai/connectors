import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan27VideoeditBody } from "./schema/inputs.ts";

/**
 * Wan 2.7 video editing — instruction-based editing and style transfer of
 * an existing clip. No requested duration by default (the output follows
 * the source clip), so the ESTIMATE reserves the 10 s ceiling and the run
 * settles on DashScope's billed seconds (input + output).
 */
const zParameters = zWan27VideoeditBody.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Wan 2.7 Video Edit",
        summary:
            "Edit a 2-10s video clip by instruction — restyle, replace subjects or clothing.",
        description: "Edit an existing video with a natural-language " +
            "instruction using Wan 2.7: transfer the whole scene to a new " +
            "style, replace subjects, clothing, or objects, optionally " +
            "guided by up to four reference images. Keeps or regenerates " +
            "the audio track (audio_setting), follows the source clip's " +
            "length by default or truncates to a requested duration. " +
            "Returns a downloadable MP4 video_url (24h expiry), " +
            "720P/1080P. Suited for: restyling footage (claymation, anime, " +
            "cinematic looks), wardrobe and product swaps, localized " +
            "content variants.",
        categories: ["video-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/wan-video-editing-api-reference",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); DashScope enforces each with a free rejection. */
        notes: [
            "Exactly one video item and up to four reference_image items.",
            "Billed seconds = input + output seconds, rounded up (a 5 s " +
            "clip edited into a 5 s output bills ~10 s). Without a " +
            "duration the estimate assumes a 10 s output and settles on " +
            "actual seconds.",
            "Generation typically takes 1-5 minutes; long or complex " +
            "requests can take 15+ minutes.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/video/wan2.7-videoedit",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/video-generation/video-synthesis",
        headers: { "X-DashScope-Async": "enable" },
    },
    input: {
        schema: {
            // The resolution selector at the BINDING (D25), `parameters`
            // prefaulted (kling D8); `duration` stays optional — omitted
            // means "keep the source length" upstream (design D8).
            body: zWan27VideoeditBody.extend({
                parameters: zParameters.extend({
                    resolution: zParameters.shape.resolution.unwrap()
                        .default("720P"),
                }).prefault({}),
            }),
        },
        /** Inject the pinned model id (design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "wan2.7-videoedit",
            }),
        }),
    },
    usage: {
        /** The VENDOR's rate card (design D5): Singapore list price per
         *  second by resolution (model-pricing page, 2026-09-16); input and
         *  output seconds bill at the same rate. */
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
        /** The hold covers the requested OUTPUT seconds; an omitted
         *  duration keeps the source length, so it reserves the 10 s
         *  ceiling (v1 `wanHoldSeconds`, design D8). Input seconds settle
         *  over the hold (v1 decision A1). */
        estimate: ({ data }) => {
            const p = data.input.body.parameters;
            const seconds = p.duration === undefined ? 10 : p.duration;
            return { counts: { [p.resolution.toLowerCase()]: seconds } };
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
