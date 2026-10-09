// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind, Unit } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Animation",
        summary: "Animation",
        description:
            "Create a Animation video. The estimated frame cost is calculated based on the `fps` and `end_seconds` input. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    endpoint: "/v1/animation",
    request: { method: "POST", path: "/v1/animation" },
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
                    fps: z
                        .number()
                        .min(1)
                        .describe("The desire output video frame rate"),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "This value determines the duration of the output video.",
                        ),
                    height: z
                        .number()
                        .int()
                        .min(64)
                        .describe(
                            "The height of the final output video. The maximum height depends on your subscription. Please refer to our [pricing page](https://magichour.ai/pricing) for more details",
                        ),
                    width: z
                        .number()
                        .int()
                        .min(64)
                        .describe(
                            "The width of the final output video. The maximum width depends on your subscription. Please refer to our [pricing page](https://magichour.ai/pricing) for more details",
                        ),
                    style: z
                        .object({
                            art_style: z
                                .enum([
                                    "Custom",
                                    "Painterly Illustration",
                                    "Vibrant Matte Illustration",
                                    "Traditional Watercolor",
                                    "Cyberpunk",
                                    "Ink and Watercolor Portrait",
                                    "Intricate Abstract Lines Portrait",
                                    "3D Render",
                                    "Old School Comic",
                                    "Bold Colored Illustration",
                                    "Synthwave",
                                    "Minimal Cold Futurism",
                                    "Futuristic Anime",
                                    "Cinematic Miyazaki",
                                    "Studio Ghibli Film Still",
                                    "Soft Delicate Matte Portrait",
                                    "Cinematic Landscape",
                                    "Landscape Painting",
                                    "Photograph",
                                    "Jackson Pollock",
                                    "Cubist",
                                    "Abstract Minimalist",
                                    "Impressionism",
                                    "Van Gogh",
                                    "Woodcut",
                                    "Oil Painting",
                                    "Vintage Japanese Anime",
                                    "Pixar",
                                    "Cosmic",
                                    "Pixel Art",
                                    "Fantasy",
                                    "Arcane",
                                    "Sin City",
                                    "Double Exposure",
                                    "Painted Cityscape",
                                    "90s Streets",
                                    "Overgrown",
                                    "Postapocalyptic",
                                    "Spooky",
                                    "Miniatures",
                                    "Low Poly",
                                    "Art Deco",
                                    "Inkpunk",
                                    "Dark Graphic Illustration",
                                    "Dark Watercolor",
                                    "Faded Illustration",
                                    "Directed by AI",
                                ])
                                .describe(
                                    "The art style used to create the output video",
                                ),
                            art_style_custom: z
                                .string()
                                .describe(
                                    "Describe custom art style. This field is required if `art_style` is `Custom`",
                                )
                                .optional(),
                            camera_effect: z
                                .enum([
                                    "Simple Zoom Out",
                                    "Simple Zoom In",
                                    "Bounce Out",
                                    "Spin Bounce",
                                    "Rolling Bounces",
                                    "Rise and Climb",
                                    "Dramatic Zoom In",
                                    "Dramatic Zoom Out",
                                    "Sway Out",
                                    "Boost Zoom In",
                                    "Boost Zoom Out",
                                    "Heartbeat",
                                    "Bounce in Place",
                                    "Earthquake Bounce",
                                    "Slice Bounce",
                                    "Bounce In And Out",
                                    "Jump",
                                    "Road Trip",
                                    "Traverse",
                                    "Rubber Band",
                                    "Rodeo",
                                    "Accelerate",
                                    "Speed of Light",
                                    "Drift Spin",
                                    "Vertigo",
                                    "Cog in the Machine",
                                    "Quadrant",
                                    "Tron",
                                    "Pusher",
                                    "Roll In",
                                    "Hesitate In",
                                    "Zoom In - Audio Sync",
                                    "Pulse - Audio Sync",
                                    "Aggressive Zoom In - Audio Sync",
                                    "Roll In - Audio Sync",
                                    "Zoom Out - Audio Sync",
                                    "Aggressive Zoom Out - Audio Sync",
                                    "Sway Out - Audio Sync",
                                    "Bounce and Spin - Audio Sync",
                                    "Zoom In and Spin - Audio Sync",
                                    "Vertigo - Audio Sync",
                                    "Bounce Out - Audio Sync",
                                    "Earthquake Bounce - Audio Sync",
                                    "Pusher - Audio Sync",
                                    "Evolve - Audio Sync",
                                    "Devolve - Audio Sync",
                                    "Slideshow",
                                    "Pan Left",
                                    "Pan Right",
                                    "Tilt Up",
                                    "Tilt Down",
                                    "Directed by AI",
                                ])
                                .describe(
                                    "The camera effect used to create the output video",
                                ),
                            prompt_type: z
                                .enum(["custom", "use_lyrics", "ai_choose"])
                                .describe(
                                    "\n* `custom` - Use your own prompt for the video.\n* `use_lyrics` - Use the lyrics of the audio to create the prompt. If this option is selected, then `assets.audio_source` must be `file` or `youtube`.\n* `ai_choose` - Let AI write the prompt. If this option is selected, then `assets.audio_source` must be `file` or `youtube`.",
                                ),
                            prompt: z
                                .string()
                                .describe(
                                    "The prompt used for the video. Prompt is required if `prompt_type` is `custom`. Otherwise this value is ignored",
                                )
                                .optional(),
                            transition_speed: z
                                .number()
                                .int()
                                .min(1)
                                .max(10)
                                .describe(
                                    "Change determines how quickly the video's content changes across frames. \n* Higher = more rapid transitions.\n* Lower = more stable visual experience.",
                                ),
                        })
                        .strict()
                        .describe("Defines the style of the output video"),
                    assets: z
                        .object({
                            audio_source: z
                                .enum(["none", "file", "youtube"])
                                .describe(
                                    "Optionally add an audio source if you'd like to incorporate audio into your video",
                                ),
                            audio_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The path of the input audio. This field is required if `audio_source` is `file`. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                            youtube_url: z
                                .string()
                                .min(1)
                                .describe(
                                    "Using a youtube video as the input source. This field is required if `audio_source` is `youtube`",
                                )
                                .optional(),
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "An initial image to use a the first frame of the video. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Provide the assets for animation."),
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
                    data.input.body.fps * data.input.body.end_seconds,
                ),
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT:
                    utils.json.optionalGet(data.output, "$.status") === "complete"
                        ? utils.json.optionalNum(data.output, "$.credits_charged") ?? 0
                        : 0,
            },
        }),
    },
});
