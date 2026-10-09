import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNanoBanana2EditBody } from "./schema/inputs.ts";

/** Google Nano Banana 2 instruction-based image editing through MuAPI. */
export default defineEndpoint({
    meta: {
        displayName: "MuAPI Nano Banana 2 Image Edit",
        summary: "Edit reference images with natural-language instructions.",
        description:
            "Edit existing images with Google's Nano Banana 2. Supply one " +
            "or more reference image URLs and describe the desired change; " +
            "the model is designed for high-fidelity transformations and " +
            "character consistency. Choose aspect ratio, 1K/2K/4K " +
            "resolution, optional Google Search prompt enhancement, and JPG " +
            "or PNG output. The request is asynchronous and completes with " +
            "an edited image URL. MuAPI's current published rate is $0.06 " +
            "at 1K, $0.09 at 2K, and $0.12 at 4K.",
        docsUrl: "https://muapi.ai/playground/nano-banana-2-edit/api",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/nano-banana-2-edit" },
    input: {
        schema: {
            body: zNanoBanana2EditBody.extend({
                prompt: zNanoBanana2EditBody.shape.prompt.unwrap(),
                images_list: zNanoBanana2EditBody.shape.images_list.unwrap(),
                aspect_ratio: zNanoBanana2EditBody.shape.aspect_ratio.unwrap()
                    .default("Auto"),
                google_search: zNanoBanana2EditBody.shape.google_search.unwrap()
                    .default(false),
                resolution: zNanoBanana2EditBody.shape.resolution.unwrap()
                    .default("1k"),
                output_format: zNanoBanana2EditBody.shape.output_format.unwrap()
                    .default("jpg"),
            }),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 600_000, pollMs: 5_000 },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "1k_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "1K edited image",
                    description: "one edited Nano Banana 2 image at 1K",
                    consumes: { credit: "default", amount: 0.06 },
                },
                "2k_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "2K edited image",
                    description: "one edited Nano Banana 2 image at 2K",
                    consumes: { credit: "default", amount: 0.09 },
                },
                "4k_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K edited image",
                    description: "one edited Nano Banana 2 image at 4K",
                    consumes: { credit: "default", amount: 0.12 },
                },
            },
        },
        estimate: ({ data }) => {
            const resolution = data.input.body.resolution;
            const key = resolution === "2k"
                ? "2k_image"
                : resolution === "4k"
                ? "4k_image"
                : "1k_image";
            return { counts: { [key]: 1 } };
        },
        evidence: ({ data }) => {
            const resolution = data.input.body.resolution;
            const key = resolution === "2k"
                ? "2k_image"
                : resolution === "4k"
                ? "4k_image"
                : "1k_image";
            return { counts: { [key]: 1 } };
        },
    },
});
