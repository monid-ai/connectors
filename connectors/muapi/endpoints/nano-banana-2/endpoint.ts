import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNanoBanana2Body } from "./schema/inputs.ts";

/** Google Nano Banana 2 text-to-image through MuAPI. */
export default defineEndpoint({
    meta: {
        displayName: "MuAPI Nano Banana 2 Image",
        summary: "Generate high-fidelity images with Google's Nano Banana 2.",
        description:
            "Generate images with Google's Nano Banana 2, also known as " +
            "Gemini 3.1 Flash Image. It combines fast generation with " +
            "high-fidelity output, 4K support, and strong character " +
            "consistency. Choose aspect ratio, resolution, Google Search " +
            "prompt enhancement, and JPG or PNG output. The request is " +
            "asynchronous and completes with an image URL. MuAPI's current " +
            "published rate is $0.06 at 1K, $0.09 at 2K, and $0.12 at 4K.",
        docsUrl: "https://muapi.ai/playground/nano-banana-2/api",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/nano-banana-2" },
    input: {
        schema: {
            body: zNanoBanana2Body.extend({
                prompt: zNanoBanana2Body.shape.prompt.unwrap(),
                aspect_ratio: zNanoBanana2Body.shape.aspect_ratio.unwrap()
                    .default("1:1"),
                google_search: zNanoBanana2Body.shape.google_search.unwrap()
                    .default(false),
                resolution: zNanoBanana2Body.shape.resolution.unwrap()
                    .default("1k"),
                output_format: zNanoBanana2Body.shape.output_format.unwrap()
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
                    label: "1K image",
                    description: "one Nano Banana 2 image at 1K",
                    consumes: { credit: "default", amount: 0.06 },
                },
                "2k_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "2K image",
                    description: "one Nano Banana 2 image at 2K",
                    consumes: { credit: "default", amount: 0.09 },
                },
                "4k_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K image",
                    description: "one Nano Banana 2 image at 4K",
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
