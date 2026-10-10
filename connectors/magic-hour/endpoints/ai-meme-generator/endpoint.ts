// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Meme Generator",
        summary: "AI Meme Generator",
        description:
            "Create an AI generated meme. Each meme costs 10 credits. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/ai-meme-generator",
    request: { method: "POST", path: "/v1/ai-meme-generator" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe("The name of the meme.")
                        .optional(),
                    style: z
                        .object({
                            topic: z
                                .string()
                                .min(1)
                                .max(200)
                                .describe("The topic of the meme."),
                            template: z
                                .enum([
                                    "Random",
                                    "Drake Hotline Bling",
                                    "Galaxy Brain",
                                    "Two Buttons",
                                    "Gru's Plan",
                                    "Tuxedo Winnie The Pooh",
                                    "Is This a Pigeon",
                                    "Panik Kalm Panik",
                                    "Disappointed Guy",
                                    "Waiting Skeleton",
                                    "Bike Fall",
                                    "Change My Mind",
                                    "Side Eyeing Chloe",
                                    "Woman Yelling at a Cat",
                                    "Success Kid",
                                    "One Does Not Simply",
                                    "Bad Luck Brian",
                                    "Futurama Fry",
                                    "Ancient Aliens",
                                    "Disaster Girl",
                                    "Hide the Pain Harold",
                                    "Distracted Boyfriend",
                                    "Left Exit 12 Off Ramp",
                                    "Running Away Balloon",
                                    "Batman Slapping Robin",
                                    "UNO Draw 25",
                                    "Mocking SpongeBob",
                                    "Boardroom Meeting Suggestion",
                                    "X, X Everywhere",
                                    "Buff Doge vs Cheems",
                                    "Bernie Once Again Asking",
                                    "Roll Safe Think About It",
                                    "Blank Nut Button",
                                    "Epic Handshake",
                                    "Sad Pablo Escobar",
                                    "Inhaling Seagull",
                                    "Surprised Pikachu",
                                    "Always Has Been",
                                    "Scroll of Truth",
                                    "Marked Safe From",
                                    "Y'all Got Any More of That",
                                    "Monkey Puppet",
                                    "Oprah You Get A",
                                    "They're the Same Picture",
                                    "I Bet He's Thinking About Other Women",
                                    "Evil Kermit",
                                    "This Is Fine",
                                    "This Is Where I'd Put My Trophy",
                                    "Anakin Padme Four Panel",
                                    "Who Killed Hannibal",
                                    "Clown Applying Makeup",
                                    "Trade Offer",
                                    "Laughing Leo",
                                    "Sleeping Shaq",
                                    "Megamind Peeking",
                                    "Grandma Finds the Internet",
                                    "Doge",
                                    "American Chopper Argument",
                                    "First World Problems",
                                    "Grumpy Cat",
                                    "SpongeBob Ight Imma Head Out",
                                    "But That's None of My Business",
                                    "Creepy Condescending Wonka",
                                    "Captain Picard Facepalm",
                                    "Hard to Swallow Pills",
                                    "Bell Curve",
                                    "Absolute Cinema",
                                    "You Guys Are Getting Paid",
                                    "Types of Headaches",
                                    "Mother Ignoring Kid Drowning in a Pool",
                                    "Flex Tape",
                                    "Spiderman Pointing at Spiderman",
                                    "Charlie Conspiracy",
                                    "Pawn Stars Best I Can Do",
                                    "0 Days Without",
                                    "Squidward Window",
                                    "Where Monkey",
                                    "Soldier Protecting Sleeping Child",
                                    "They Don't Know",
                                    "Spiderman Triple",
                                    "Two Guys on a Bus",
                                    "Imagination SpongeBob",
                                    "All My Homies Hate",
                                    "You Know I'm Something of a Scientist Myself",
                                    "Anime Girl Hiding from Terminator",
                                    "A Train Hitting a School Bus",
                                    "AJ Styles and Undertaker",
                                    "Three-Headed Dragon",
                                    "Grant Gustin Over Grave",
                                    "Whisper and Goosebumps",
                                    "Scooby Doo Mask Reveal",
                                    "Domino Effect",
                                    "Two Paths",
                                    "I'm the Captain Now",
                                    "Say the Line Bart",
                                    "Star Wars Yoda",
                                    "Grim Reaper Knocking Door",
                                    "Yo Dawg Heard You",
                                    "Gus Fring We Are Not the Same",
                                    "C'mon Do Something",
                                    "Leonardo DiCaprio Cheers",
                                ])
                                .describe(
                                    "To use our templates, pass in one of the enum values.",
                                ),
                            searchWeb: z
                                .boolean()
                                .describe(
                                    "Whether to search the web for meme content.",
                                )
                                .optional(),
                        })
                        .strict(),
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
