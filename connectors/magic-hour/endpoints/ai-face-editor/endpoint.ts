// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Face Editor",
        summary: "AI Face Editor",
        description:
            "Edit facial features of an image using AI. Each edit costs 1 frame. The height/width of the output image depends on your subscription. Please refer to our [pricing](https://magichour.ai/pricing) page for more details Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/ai-face-editor",
    request: { method: "POST", path: "/v1/ai-face-editor" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your image a custom name for easy identification.",
                        )
                        .optional(),
                    assets: z
                        .object({
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "This is the image whose face will be edited. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for face editor"),
                    style: z
                        .object({
                            enhance_face: z
                                .boolean()
                                .describe("Enhance face features")
                                .optional(),
                            eyebrow_direction: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Eyebrow direction (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            eye_gaze_horizontal: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Horizontal eye gaze (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            eye_gaze_vertical: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Vertical eye gaze (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            eye_open_ratio: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Eye open ratio (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            lip_open_ratio: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Lip open ratio (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            head_roll: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Head roll (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_grim: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Mouth grim (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_pout: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Mouth pout (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_purse: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Mouth purse (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_smile: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Mouth smile (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_position_horizontal: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Horizontal mouth position (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            mouth_position_vertical: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Vertical mouth position (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            head_pitch: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Head pitch (-100 to 100), in increments of 5",
                                )
                                .optional(),
                            head_yaw: z
                                .number()
                                .min(-100)
                                .max(100)
                                .multipleOf(5)
                                .describe(
                                    "Head yaw (-100 to 100), in increments of 5",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Face editing parameters"),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
        },
    },
});
