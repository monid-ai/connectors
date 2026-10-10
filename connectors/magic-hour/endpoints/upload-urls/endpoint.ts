// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Generate asset upload urls",
        summary: "Generate asset upload urls",
        description:
            "Generates a list of pre-signed upload URLs for the assets required. This API is only necessary if you want to upload to Magic Hour's storage. Refer to the [Input Files Guide](https://docs.magichour.ai/integration/inputs-and-outputs) for more details.\n\nThe response array will match the order of items in the request body.\n\n**Valid file extensions per asset type**:\n- video: mp4, m4v, mov, webm\n- audio: mp3, wav, aac, flac, webm, weba, m4a, opus, ogg, oga, aiff, amr\n- image: png, jpg, jpeg, jfif, heic, heif, webp, avif, jp2, tiff, tif, bmp\n- gif: gif, webp, webm\n\n> Note: `gif` is only supported for face swap API `video_file_path` field.\n\nOnce you receive an upload URL, send a `PUT` request to upload the file directly.\n\nExample:\n\n```\ncurl -X PUT --data '@/path/to/file/video.mp4' \\\n  https://videos.magichour.ai/api-assets/id/video.mp4?<auth params from the API response>\n```\n",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/files/upload-urls",
    request: { method: "POST", path: "/v1/files/upload-urls" },
    input: {
        schema: {
            body: z
                .object({
                    items: z
                        .array(
                            z
                                .object({
                                    type: z
                                        .enum(["video", "audio", "image"])
                                        .describe(
                                            "The type of asset to upload. Possible types are video, audio, image",
                                        ),
                                    extension: z
                                        .string()
                                        .regex(new RegExp("^[a-z0-9]+$"))
                                        .describe(
                                            "The extension of the file to upload. Do not include the dot (.) before the extension. Possible extensions are mp4,m4v,mov,webm,mp3,wav,aac,flac,webm,weba,m4a,opus,ogg,oga,aiff,amr,png,jpg,jpeg,jfif,heic,heif,webp,avif,jp2,tiff,tif,bmp,gif,webp,webm",
                                        ),
                                })
                                .strict(),
                        )
                        .min(1)
                        .describe(
                            "The list of assets to upload. The response array will match the order of items in the request body.",
                        ),
                })
                .strict(),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
