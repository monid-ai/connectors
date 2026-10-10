import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Video-to-Video",
        summary: "Video-to-Video",
        description:
            "Video-to-Video. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/video-to-video" },
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
                    fps_resolution: z
                        .enum(["FULL", "HALF"])
                        .describe(
                            "Determines whether the resulting video will have the same frame per second as the original video, or half.\n* `FULL` - the result video will have the same FPS as the input video\n* `HALF` - the result video will have half the FPS as the input video",
                        )
                        .optional(),
                    style: z
                        .object({
                            art_style: z.enum([
                                "Minecraft",
                                "Watercolor",
                                "Pixel",
                                "Retro Sci-Fi",
                                "Lego",
                                "Origami",
                                "Ghost",
                                "Sub-Zero",
                                "Studio Ghibli",
                                "Comic",
                                "Impressionism",
                                "Master Chief",
                                "Solid Snake",
                                "Street Fighter",
                                "Hologram",
                                "GTA",
                                "Clay",
                                "Mystique",
                                "Dragonball Z",
                                "Mario",
                                "Samurai",
                                "Spartan",
                                "Boba Fett",
                                "3D Render",
                                "Airbender",
                                "Android",
                                "Anime Warrior",
                                "Armored Knight",
                                "Assassin's Creed",
                                "Avatar",
                                "Black Spiderman",
                                "Bold Anime",
                                "Celestial Skin",
                                "Chinese Swordsmen",
                                "Cyberpunk",
                                "Cypher",
                                "Dark Fantasy",
                                "Future Bot",
                                "Futuristic Fantasy",
                                "Ghibli Anime",
                                "Gundam",
                                "Illustration",
                                "Ink",
                                "Ink Poster",
                                "Jinx",
                                "Knight",
                                "Link",
                                "Marble",
                                "Mech",
                                "Naruto",
                                "Neon Dream",
                                "No Art Style",
                                "Oil Painting",
                                "On Fire",
                                "Painterly Anime",
                                "Pixar",
                                "Power Armor",
                                "Power Ranger",
                                "Radiant Anime",
                                "Realistic Anime",
                                "Realistic Pixar",
                                "Retro Anime",
                                "Samurai Bot",
                                "Sharp Anime",
                                "Soft Anime",
                                "Starfield",
                                "The Void",
                                "Tomb Raider",
                                "Underwater",
                                "Van Gogh",
                                "Viking",
                                "Western Anime",
                                "Wu Kong",
                                "Wuxia Anime",
                                "Zelda",
                            ]),
                            version: z
                                .enum(["v1", "v2", "default"])
                                .describe(
                                    "* `v1` - more detail, closer prompt adherence, and frame-by-frame previews.\n* `v2` - faster, more consistent, and less noisy.\n* `default` - use the default version for the selected art style.",
                                )
                                .optional(),
                            prompt_type: z
                                .enum(["default", "custom", "append_default"])
                                .describe(
                                    "* `default` - Use the default recommended prompt for the art style.\n* `custom` - Only use the prompt passed in the API. Note: for v1, lora prompt will still be auto added to apply the art style properly.\n* `append_default` - Add the default recommended prompt to the end of the prompt passed in the API.",
                                )
                                .optional(),
                            prompt: z
                                .string()
                                .nullable()
                                .describe(
                                    "The prompt used for the video. Prompt is required if `prompt_type` is `custom` or `append_default`. If `prompt_type` is `default`, then the `prompt` value passed will be ignored.",
                                )
                                .optional(),
                            model: z
                                .enum([
                                    "Dreamshaper",
                                    "Absolute Reality",
                                    "Flat 2D Anime",
                                    "Soft Anime",
                                    "Kaywaii",
                                    "Western Anime",
                                    "3D Anime",
                                    "default",
                                ])
                                .describe(
                                    "* `Dreamshaper` - a good all-around model that works for both animations as well as realism.\n* `Absolute Reality` - better at realism, but you'll often get similar results with Dreamshaper as well.\n* `Flat 2D Anime` - best for a flat illustration style that's common in most anime.\n* `default` - use the default recommended model for the selected art style.",
                                )
                                .optional(),
                        })
                        .strict(),
                    assets: z
                        .object({
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
                            "Provide the assets for video-to-video. For video, The `video_source` field determines whether `video_file_path` or `youtube_url` field is used",
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
                CREDIT:
                    Math.ceil(
                        (data.input.body.fps_resolution === "FULL" ? 30 : 15) *
                            (data.input.body.end_seconds -
                                (data.input.body.start_seconds ?? 0)),
                    ) * 2,
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
