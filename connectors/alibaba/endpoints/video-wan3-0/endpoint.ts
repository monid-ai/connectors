import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan30Body } from "./schema/inputs.ts";

/**
 * Wan 3.0 Video — the all-in-one Wan 3.0 tier: up to 30 seconds from a text prompt,
 * pinned frames, reference images / videos / audio, an office document or
 * a web link. The async machinery (lifecycle, credit pool) is inherited
 * from the provider; what lives here is this model's identity, capability
 * surface and rate card.
 */
const zParameters = zWan30Body.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Wan 3.0 Video",
        summary:
            "Generate up to 30s of video from text, frames, reference media, documents, or links.",
        description:
            'Generate video from any mix of inputs with one request: a text prompt (up to 20,000 characters), pinned first/last frames, reference images (up to 10), reference video and audio clips, an office document or PDF, or a web link, with Wan 3.0. Supports smart duration ("auto"), adaptive aspect ratio, and prompt rewriting. Returns a downloadable MP4 video_url (24h expiry) with synchronized audio, 2-30 seconds, 480P/720P/1080P. Suited for: short-form social clips, ads and product demos, storyboard-to-video, document and article explainers, character-consistent scenes.',
        categories: ["video-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); DashScope enforces each with a free rejection. */
        notes: [
            "first_frame / last_frame cannot be combined with " +
            "reference_image / reference_video / reference_audio / file / " +
            "link in the same request; file and link cannot be combined " +
            "with each other.",
            "At most one first_frame, one last_frame, one file and one " +
            "link; up to 10 reference_image; up to 5 reference_video and 5 " +
            "reference_audio, each clip 1-15 s and 15 s combined per type.",
            "With a file or link, parameters.prompt_extend must stay true.",
            "Billed seconds = input video/audio seconds + output video " +
            "seconds, so reference clips add to the charge; the estimate " +
            "holds the requested OUTPUT seconds only and the run settles " +
            "on DashScope's usage.duration.",
            'Because duration "auto" lets the MODEL pick the length, the ' +
            "estimate reserves a full 30-second output and releases the " +
            "unused portion at settle. Pass an explicit duration for a " +
            "tight hold.",
            "DashScope currently discounts wan3.0-video by 30% for a limited time; the rates here are the published list price.",
            "Generation typically takes 1-5 minutes; long or complex " +
            "requests can take 15+ minutes.",
        ],
    },
    /** PUBLIC identity: v1's published id. Pinned because all six Wan video
     *  endpoints share one create-task path, so the derived
     *  `?? request.path` default would collide (design D1). */
    endpoint: "/v1/video/wan3.0",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/video-generation/video-synthesis",
        // REQUIRED on the async video path (without it DashScope rejects
        // with "current user api does not support synchronous calls") and
        // forbidden on the blocking image path — so it is the endpoint's
        // header, not the provider's (design D6)
        headers: { "X-DashScope-Async": "enable" },
    },
    input: {
        schema: {
            // Price selectors at the BINDING (D25): `parameters` is
            // prefaulted so resolution and duration materialize even when
            // the caller sends none (kling D8). 720P is v1's deliberate
            // default (proposal B2: DashScope's own default is 1080P, the
            // most expensive tier) — design D8.
            body: zWan30Body.extend({
                parameters: zParameters.extend({
                    resolution: zParameters.shape.resolution.unwrap()
                        .default("720P"),
                    duration: zParameters.shape.duration.unwrap().default(5),
                }).prefault({}),
            }),
        },
        /** Inject the pinned model id (design D2 — the endpoint IS the
         *  model, so `model` is never caller-supplied) and translate OUR
         *  named "auto" mode to DashScope's `-1` smart-duration sentinel at
         *  the wire boundary (the bytedance D8 idiom). `utils.json.merge`
         *  is deep, so only `parameters.duration` is replaced. */
        toRequest: ({ data, utils }) => {
            const body = utils.json.merge(data.input.body ?? {}, {
                model: "wan3.0-video",
            });
            const duration = utils.json.optionalGet(
                body,
                "$.parameters.duration",
            );
            if (duration !== "auto") {
                return { ...data.input, body };
            }
            return {
                ...data.input,
                body: utils.json.merge(body, { parameters: { duration: -1 } }),
            };
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): Singapore list price per
         *  second by resolution (model-pricing page, 2026-09-16). DashScope currently marks wan3.0-video "Limited-time 30% off"; the doc carries the LIST price (owner decision 2026-09-16, design D3) — the promo has no published end date and is not modelled. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "480p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "480P seconds",
                    description: "US$0.05 per billed second at 480P",
                    consumes: { credit: "default", amount: 0.05 },
                },
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720P seconds",
                    description: "US$0.10 per billed second at 720P",
                    consumes: { credit: "default", amount: 0.10 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080P seconds",
                    description: "US$0.20 per billed second at 1080P",
                    consumes: { credit: "default", amount: 0.20 },
                },
            },
        },
        /** The hold covers the requested OUTPUT seconds on the selected
         *  line (v1 decision A1: input-clip seconds are unknowable before
         *  the run and settle over the hold); "auto" reserves the 30 s
         *  ceiling (design D8). */
        estimate: ({ data }) => {
            const p = data.input.body.parameters;
            const seconds = p.duration === "auto" ? 30 : p.duration;
            return { counts: { [p.resolution.toLowerCase()]: seconds } };
        },
        /** Settle on the vendor's OWN meter — `usage.duration`, the field
         *  DashScope documents as the billing figure (input + output
         *  seconds, fractional) — keyed from the REQUEST (design D5). The
         *  engine's fold rounds a fractional count UP to the next whole
         *  second (owner decision, design D4). */
        evidence: ({ data, utils, logger }) => {
            const seconds = utils.json.optionalNum(
                data.output,
                "$.usage.duration",
            );
            if (seconds === undefined || seconds <= 0) {
                // Succeeded without a usage figure — a vendor anomaly.
                // Zero-billed (the basis is missing), said out loud.
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
