import { z } from "zod";
import { zBrandId, zPackType } from "../../../schema/common.ts";

/**
 * MCP `create_ads` arguments — hosted schema 2026-09-22. Required:
 * brandId, targetAudience, keyMessage, tone. Kit aliases (pack_type /
 * packType / ad_pack / platformPack) are mirrored as the vendor sends them.
 */
export const zCreateAdsBody = z.object({
    brandId: zBrandId,
    targetAudience: z.string().describe("Who the ads are for."),
    keyMessage: z.string().describe("The single key message."),
    tone: z.string().describe(
        'Tone of voice, e.g. "bold", "warm", "premium".',
    ),
    pack_type: zPackType.optional().describe(
        "Ad kit type; prefer this over platformPack.",
    ),
    packType: zPackType.optional().describe("Alias for pack_type."),
    ad_pack: zPackType.optional().describe("Alias for pack_type."),
    platformPack: z.literal("meta-dual").optional().describe(
        "Backward-compatible Meta ad pack alias (same as pack_type=meta).",
    ),
    placements: z.array(z.enum(["feed", "reels", "stories"])).min(1).max(3)
        .optional(),
    ratios: z.array(z.enum(["4:5", "9:16"])).min(1).max(2).optional()
        .describe(
            "Meta native ratios; every Meta concept always includes both.",
        ),
    copyMode: z.literal("manager-split").optional(),
    strictHook: z.boolean().optional().describe(
        "Reject a failed primary-text line-1 hook before rendering.",
    ),
    soundOff: z.boolean().optional().describe(
        "Meta Reels/Stories require true; false is rejected.",
    ),
    constraints: z.object({
        do: z.array(z.string().max(300)).max(20).optional(),
        dont: z.array(z.string().max(300)).max(20).optional(),
    }).optional(),
    platform: z.enum([
        "chatgpt-ads",
        "meta-feed",
        "meta-stories-reels",
        "meta-dual",
        "linkedin-feed",
        "x-ads",
        "youtube-demand-gen",
        "tiktok-carousel",
        "google-search",
    ]).optional().describe(
        "Generate concepts for this platform at its native aspect.",
    ),
    aspectRatios: z.array(z.string().max(30)).min(1).max(3).optional()
        .describe(
            'One to three ratios, e.g. ["1:1"] or ["9:16","1:1","16:9"].',
        ),
    customDimensions: z.array(z.object({
        width: z.number().int().min(256).max(3840),
        height: z.number().int().min(256).max(3840),
    })).min(1).max(3).optional().describe(
        "Exact custom export pixels, cycled over three concepts.",
    ),
    productName: z.string().optional(),
    geography: z.string().optional().describe("Target geography."),
    placement: z.string().optional().describe(
        'Where the ads run, e.g. "Instagram feed".',
    ),
    uniqueSellingPoint: z.string().optional(),
    creativeDirection: z.string().optional().describe(
        "Free-text steer for asset/casting selection.",
    ),
    pinnedAssets: z.record(z.string(), z.number().int()).optional().describe(
        'Pin brand entities per slot, e.g. {"logo":123,"character":456}.',
    ),
    excludedSlots: z.array(z.enum([
        "logo",
        "character",
        "product",
        "scene",
        "prop",
        "typography",
    ])).optional().describe(
        "Exclude these Cast UI slots from automatic casting.",
    ),
    logoRendering: z.enum(["auto", "brand_candy", "truecast"]).optional()
        .describe(
            "Logo lane: auto (default), brand_candy, or truecast.",
        ),
    adStyle: z.enum([
        "legendary",
        "bold-headline",
        "visual-impact",
        "product-hero",
        "long-copy",
        "shot-on-phone",
        "surprise",
    ]).optional(),
    campaignId: z.number().int().positive().optional().describe(
        "Optional campaign id from list_campaigns / get_campaign / create_campaign.",
    ),
});
