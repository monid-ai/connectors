// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Face Swap Photo",
        summary: "Face Swap Photo",
        description:
            "Create a face swap photo. Each photo costs 10 credits. The height/width of the output image depends on your subscription. Please refer to our [pricing](https://magichour.ai/pricing) page for more details Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/face-swap-photo",
    request: { method: "POST", path: "/v1/face-swap-photo" },
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
                            face_swap_mode: z
                                .enum(["all-faces", "individual-faces"])
                                .describe(
                                    "Choose how to swap faces:\n- **all-faces** (recommended) — swap all detected faces using one source image (`source_file_path` required)\n- **individual-faces** — specify exact mappings using `face_mappings`",
                                )
                                .optional(),
                            source_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "This is the image from which the face is extracted. The value is required if `face_swap_mode` is `all-faces`.\n\nThis value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                            face_mappings: z
                                .array(
                                    z
                                        .object({
                                            original_face: z
                                                .string()
                                                .describe(
                                                    "The face detected from the image in `target_file_path`. The file name is in the format of `<face_frame>-<face_index>.png`. This value is corresponds to the response in the [face detection API](https://docs.magichour.ai/api-reference/files/get-face-detection-details).\n\n* The face_frame is the frame number of the face in the target image. For images, the frame number is always 0.\n* The face_index is the index of the face in the target image, starting from 0 going left to right.",
                                                ),
                                            new_face: z
                                                .string()
                                                .describe(
                                                    "The face image that will be used to replace the face in the `original_face`. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                                ),
                                        })
                                        .strict(),
                                )
                                .max(5)
                                .describe(
                                    "This is the array of face mappings used for multiple face swap. The value is required if `face_swap_mode` is `individual-faces`.",
                                )
                                .optional(),
                            target_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "This is the image where the face from the source image will be placed. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for face swap photo"),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 10 },
        },
    },
});
