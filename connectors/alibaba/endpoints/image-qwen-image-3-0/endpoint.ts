import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zQwenImage30Body } from "./schema/inputs.ts";

/**
 * Qwen-Image 3.0 (standard) — text-to-image AND image editing in one
 * model, served by DashScope's BLOCKING multimodal path: this endpoint
 * overrides the provider's async submit with the blocking relay (design
 * D6). One output rate for both size tiers, plus a per-input-image line.
 */
const zParameters = zQwenImage30Body.shape.parameters.unwrap();

export default defineEndpoint({
    meta: {
        displayName: "Qwen-Image 3.0",
        summary:
            "Generate images from text, or edit 1-3 input images by instruction — the standard tier.",
        description: "Generate images from a text prompt, or edit/compose " +
            "from up to three input images with a natural-language " +
            "instruction (one model does both) with Qwen-Image 3.0 — the " +
            "standard tier, balancing quality and speed. Supports precise " +
            "in-image text rendering (multi-line layouts, paragraphs, UI " +
            "mockups, posters, slides), negative prompts, free " +
            "width*height sizing up to 2048*2048 at 1:8-8:1, and 1-6 " +
            "outputs per run. Returns PNG image URLs (24h expiry). Suited " +
            "for: marketing posters and banners, UI/slide mockups, " +
            "storyboards, product shots, style transfer and subject edits.",
        categories: ["image-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference",
        notes: [
            "Generation typically takes 20-60 seconds per run; the call " +
            "blocks until the images are ready.",
            'prompt_extend_mode "agent" is text-to-image only — DashScope ' +
            "rejects it with input images (free).",
            "Non-compliant prompts are blocked by upstream content " +
            "moderation (DataInspectionFailed) — blocked runs are not " +
            "charged.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/image/qwen-image-3.0",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/multimodal-generation/generation",
    },
    // The blocking call IS the run (v1 decision C1). `pollMs` is inherited
    // from the provider and inert here.
    timeouts: { requestMs: 600_000, runMs: 660_000 },
    input: {
        schema: {
            // `size` REQUIRED at the binding (the binding rule of its pro
            // sibling, kept identical so the two docs read alike); `n`
            // takes DashScope's default (D24/D25).
            body: zQwenImage30Body.extend({
                parameters: zParameters.required({ size: true }).extend({
                    n: zParameters.shape.n.unwrap().default(1),
                }),
            }),
        },
        /** Inject the pinned model id (design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "qwen-image-3.0",
            }),
        }),
    },
    lifecycle: {
        /** OVERRIDES the provider's async submit: the image path answers
         *  the finished images in ONE blocking call. Non-2xx is data; a 2xx
         *  carrying DashScope's error envelope (non-empty `code`) is a
         *  synthesized 502 (design D7); else the envelope settles 200. */
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                logger.warn(
                    "dashscope image call non-2xx — returning as data",
                    {
                        status: res.status,
                    },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const code = utils.json.optionalGet(res.body, "$.code");
            if (typeof code === "string" && code !== "") {
                logger.warn(
                    "dashscope image call answered 2xx with an error envelope — synthesizing 502",
                    { code },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        /** The VENDOR's rate card (design D5): Singapore list price per
         *  image (model-pricing page, 2026-09-16) — one output rate for
         *  both size tiers, plus one line per input image. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "output_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "output images",
                    description: "US$0.03 per output image, any size",
                    consumes: { credit: "default", amount: 0.03 },
                },
                "input_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "input images",
                    description: "US$0.003 per input image",
                    consumes: { credit: "default", amount: 0.003 },
                },
            },
        },
        /** The hold: `n` outputs plus the input images in the message. */
        estimate: ({ data }) => {
            const inputs = data.input.body.input.messages[0].content.filter((
                item,
            ) => "image" in item).length;
            return {
                counts: {
                    "output_image": data.input.body.parameters.n,
                    ...(inputs > 0 ? { "input_image": inputs } : {}),
                },
            };
        },
        /** Settle on the vendor's OWN counters — `usage.output_image_count`
         *  (blocked images are omitted, so it can be below `n`) and
         *  `usage.input_image_count`. */
        evidence: ({ data, utils, logger }) => {
            const outputs = utils.json.optionalNum(
                data.output,
                "$.usage.output_image_count",
            );
            if (outputs === undefined) {
                logger.warn(
                    "dashscope image call settled without usage — zero-billing",
                );
                return { counts: {} };
            }
            const inputs = utils.json.optionalNum(
                data.output,
                "$.usage.input_image_count",
            );
            return {
                counts: {
                    "output_image": outputs,
                    ...(inputs !== undefined && inputs > 0
                        ? { "input_image": inputs }
                        : {}),
                },
            };
        },
    },
});
