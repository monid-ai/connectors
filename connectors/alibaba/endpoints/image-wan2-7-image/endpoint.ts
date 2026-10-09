import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWan27ImageBody } from "./schema/inputs.ts";

/**
 * Wan 2.7 Image — text-to-image, image editing, multi-image reference and
 * story-coherent image SETS, served by DashScope's BLOCKING multimodal
 * path: this endpoint overrides the provider's async submit with the
 * blocking relay (design D6). Plain per-result metering: one flat rate per
 * image actually generated, regardless of size or mode; input images are
 * free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Wan 2.7 Image",
        summary:
            "Generate images fast, edit with references, or produce coherent image sets.",
        description:
            "Generate images from text, edit or compose from up to nine input images, place objects with bounding boxes (interactive editing), or produce a story-coherent SET of up to 12 images from one request with Wan 2.7 Image — the faster tier, same feature set up to 2K. Supports thinking mode, custom color palettes (3-10 colors), and free width*height sizing. Returns PNG image URLs (24h expiry). Suited for: seasonal and campaign image series with a consistent subject, product placement into scenes, style-guided redesigns, high-resolution art and print assets.",
        categories: ["image-generation"],
        docsUrl:
            "https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-and-editing-api-reference",
        /** CROSS-field rules the compiled JSON Schema cannot express (design
         *  D9); DashScope enforces each with a free rejection. */
        notes: [
            "Generation takes tens of seconds; image sets can take " +
            "minutes. The call blocks until the images are ready.",
            "n is 1-4 unless enable_sequential is true (then 1-12). In " +
            "image-set mode the MODEL decides how many images to return " +
            "(never more than n) — you are billed for the actual count.",
            "color_palette and thinking_mode apply only outside image-set " +
            "mode; bbox_list must have one entry per input image.",
        ],
    },
    /** PUBLIC identity: v1's published id (design D1). */
    endpoint: "/v1/image/wan2.7-image",
    request: {
        method: "POST",
        path: "/api/v1/services/aigc/multimodal-generation/generation",
    },
    // The blocking call IS the run (v1 decision C1). `pollMs` is inherited
    // from the provider and inert here.
    timeouts: { requestMs: 600_000, runMs: 660_000 },
    input: {
        schema: { body: zWan27ImageBody },
        /** Inject the pinned model id (design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "wan2.7-image",
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
         *  successfully generated image, independent of size and mode
         *  (model-pricing page, 2026-09-16). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "images",
            description: "US$0.03 per image actually generated",
            consumes: { credit: "default", amount: 0.03 },
        },
        /** The hold covers the requested image ceiling: `n`, or
         *  DashScope's own default when omitted — 12 in image-set mode (the
         *  model decides, up to n), 1 otherwise (v1 `wanImageHoldCount`);
         *  settle releases the unused part. */
        estimate: ({ data }) => {
            const p = data.input.body.parameters;
            const setMode = p?.enable_sequential === true;
            const n = p?.n === undefined ? (setMode ? 12 : 1) : p.n;
            return { counts: { "RESULT": n } };
        },
        /** Settle on the vendor's OWN counter — `usage.image_count`, the
         *  images actually generated (blocked ones are omitted). */
        evidence: ({ data, utils, logger }) => {
            const images = utils.json.optionalNum(
                data.output,
                "$.usage.image_count",
            );
            if (images === undefined) {
                logger.warn(
                    "dashscope image call settled without usage — zero-billing",
                );
                return { counts: {} };
            }
            return { counts: { "RESULT": images } };
        },
    },
});
