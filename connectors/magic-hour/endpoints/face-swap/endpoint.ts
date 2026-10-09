// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind, Unit } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Face Swap Video",
        summary: "Face Swap Video",
        description:
            "**What this API does**\n\nCreate the same Face Swap you can make in the browser, but programmatically, so you can automate it, run it at scale, or connect it to your own app or workflow.\n    \n**Good for**\n- Automation and batch processing  \n- Adding face swap into apps, pipelines, or tools  \n\n**How it works (3 steps)**\n1) Upload your inputs (video, image, or audio) with [Generate Upload URLs](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls) and copy the `file_path`.  \n2) Send a request to create a face swap job with the basic fields.  \n3) Check the job status until it's `complete`, then download the result from `downloads`.\n\n**Key options**\n- Inputs: usually a file, sometimes a YouTube link, depending on project type  \n- Resolution: free users are limited to 576px; higher plans unlock HD and larger sizes  \n- Extra fields: e.g. `face_swap_mode`, `start_seconds`/`end_seconds`, or a text prompt  \n\n**Cost**  \nCredits are only charged for the frames that actually render. You'll see an estimate when the job is queued, and the final total after it's done.\n\nFor detailed examples, see the [product page](https://magichour.ai/products/face-swap). Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    endpoint: "/v1/face-swap",
    request: { method: "POST", path: "/v1/face-swap" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your video a custom name for easy identification.",
                        )
                        .optional(),
                    start_seconds: z
                        .number()
                        .min(0)
                        .describe(
                            "Start time of your clip (seconds). Must be ≥ 0.",
                        ),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "End time of your clip (seconds). Must be greater than start_seconds.",
                        ),
                    style: z
                        .object({
                            version: z
                                .enum(["v1", "v2", "default"])
                                .describe(
                                    "* `v1` - May preserve skin detail and texture better, but weaker identity preservation.\n* `v2` - Faster, sharper, better handling of hair and glasses. stronger identity preservation.\n* `default` - Use the version we recommend, which will change over time. This is recommended unless you need a specific earlier version. This is the default behavior.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Style of the face swap video.")
                        .optional(),
                    assets: z
                        .object({
                            face_swap_mode: z
                                .enum(["all-faces", "individual-faces"])
                                .describe(
                                    "Choose how to swap faces:\n- **all-faces** (recommended) — swap all detected faces using one source image (`source_file_path` required)\n- **individual-faces** — specify exact mappings using `face_mappings`",
                                )
                                .optional(),
                            image_file_path: z
                                .string()
                                .describe(
                                    "The path of the input image with the face to be swapped.  The value is required if `face_swap_mode` is `all-faces`.\n\nThis value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
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
                                                    "The face image that will be used to replace the face in the `original_face`. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                                ),
                                        })
                                        .strict(),
                                )
                                .max(5)
                                .describe(
                                    "This is the array of face mappings used for multiple face swap. The value is required if `face_swap_mode` is `individual-faces`.",
                                )
                                .optional(),
                            video_source: z
                                .enum(["file", "youtube"])
                                .describe("Choose your video source."),
                            video_file_path: z
                                .string()
                                .describe(
                                    "Your video file. Required if `video_source` is `file`. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                            youtube_url: z
                                .string()
                                .describe(
                                    "YouTube URL (required if `video_source` is `youtube`).",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Provide the assets for face swap. For video, The `video_source` field determines whether `video_file_path` or `youtube_url` field is used",
                        ),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: {
                CREDIT: Math.ceil(
                    30 *
                        (data.input.body.end_seconds -
                            data.input.body.start_seconds),
                ),
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT:
                    utils.json.optionalGet(data.output, "$.status") ===
                    "complete"
                        ? (utils.json.optionalNum(
                              data.output,
                              "$.credits_charged",
                          ) ?? 0)
                        : 0,
            },
        }),
    },
});
