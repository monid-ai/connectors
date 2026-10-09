import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zImageGenerateBody } from "./schema/inputs.ts";

/**
 * Venice `POST /image/generate` — text-to-image, one blocking call that
 * returns base64 images inline.
 *
 * Billing: Venice reports no meter on this endpoint, so the pinned rate
 * card is the bill. The connector carries only FLAT-priced models (one
 * price per image regardless of size or quality — GET /models?type=image,
 * verified 2026-10-08); resolution- and quality-tiered models are left for
 * a follow-up rather than approximated. One PER_UNIT line per price tier,
 * counted per image actually returned:
 *   - img_001: $0.01 — venice-sd35, lustify-sdxl, lustify-v7, lustify-v8,
 *     wai-Illustrious
 *   - img_003: $0.03 — qwen-image, flux-2-pro
 *   - img_009: $0.09 — hunyuan-image-v3, flux-2-max
 */
export default defineEndpoint({
    meta: {
        displayName: "Venice Image Generation",
        summary: "Text-to-image with private, uncensored and frontier " +
            "models — $0.01 to $0.09 per image.",
        description: "Generate 1-4 images from a text prompt. Private " +
            "Venice-hosted models never store the prompt or image: " +
            "`venice-sd35`, `hunyuan-image-v3`, `wai-Illustrious` (anime), " +
            "and the uncensored `lustify-sdxl` / `lustify-v7` / " +
            "`lustify-v8`. Anonymized proxies give `qwen-image` (strong " +
            "text rendering, best quality per dollar), `flux-2-pro` and " +
            "`flux-2-max`. Set `safe_mode: false` for adult content — " +
            "with it on (the default), adult images come back blurred. " +
            "Control size with width/height (up to 1280) or aspect_ratio, " +
            "plus seed, steps, cfg_scale, negative_prompt and Venice style " +
            "presets. Images are returned INLINE as base64 in `images` " +
            "(no expiring URLs). Priced per image: $0.01 (SD3.5, Lustify, " +
            "Illustrious), $0.03 (qwen-image, flux-2-pro), $0.09 " +
            "(hunyuan-image-v3, flux-2-max).",
        docsUrl: "https://docs.venice.ai/api-reference/endpoint/image/generate",
        categories: ["image-generation"],
        notes: [
            "Images are base64 in the response body — about 50-150 KB per " +
            "webp image at 1024px.",
            "A prompt over the model's character limit is rejected by " +
            "Venice with a 400 (1500 on the SDXL/SD3.5 family, 2048 on " +
            "qwen-image, 3000 elsewhere).",
            "With `safe_mode` on, a blurred image is still a billed image.",
        ],
    },
    request: { method: "POST", path: "/image/generate" },
    input: {
        schema: {
            // `variants` is the estimate's basis — vendor default 1.
            body: zImageGenerateBody.extend({
                variants: zImageGenerateBody.shape.variants.unwrap()
                    .default(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                img_001: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "images ($0.01)",
                    description: "venice-sd35, lustify-sdxl, lustify-v7, " +
                        "lustify-v8, wai-Illustrious",
                    consumes: { credit: "default", amount: 0.01 },
                },
                img_003: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "images ($0.03)",
                    description: "qwen-image, flux-2-pro",
                    consumes: { credit: "default", amount: 0.03 },
                },
                img_009: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "images ($0.09)",
                    description: "hunyuan-image-v3, flux-2-max",
                    consumes: { credit: "default", amount: 0.09 },
                },
            },
        },
        /** The caller-stated `variants` IS the image promise. */
        estimate: ({ data }) => {
            const m = data.input.body.model;
            const key = m === "qwen-image" || m === "flux-2-pro"
                ? "img_003"
                : m === "hunyuan-image-v3" || m === "flux-2-max"
                ? "img_009"
                : "img_001";
            return { counts: { [key]: data.input.body.variants } };
        },
        /** Count the images that came back, not the ones asked for. */
        evidence: ({ data, utils }) => {
            const n = utils.json.optionalLen(data.output, "$.images") ?? 0;
            const m = utils.json.optionalGet(data.input.body ?? {}, "$.model");
            const key = m === "qwen-image" || m === "flux-2-pro"
                ? "img_003"
                : m === "hunyuan-image-v3" || m === "flux-2-max"
                ? "img_009"
                : "img_001";
            return { counts: { [key]: n } };
        },
    },
    timeouts: { requestMs: 180_000, runMs: 240_000 },
});
