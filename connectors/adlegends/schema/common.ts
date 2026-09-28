import { z } from "zod";

/** Live Fast Ads kit ids from the hosted MCP `pack_type` enum. */
export const zPackType = z.enum([
    "meta",
    "linkedin",
    "google_search",
    "youtube",
    "tiktok",
    "x",
    "chatgpt",
]);

/** Brand id from list_brands / create_brand_from_url / get_started. */
export const zBrandId = z.number().int().describe(
    "Brand id from list_brands, create_brand_from_url, or get_started.",
);

/** Caller-generated retry key used by create_manual_brand and plan_media. */
export const zRequestId = z.string().min(1).max(200).describe(
    "Caller-generated retry key. Reuse only after a transport failure.",
);

/** Media-plan context already held by the calling agent (get_started). */
export const zPlanningContext = z.object({
    brandName: z.string().optional(),
    businessDescription: z.string().optional(),
    productOrService: z.string().optional(),
    objective: z.string().optional(),
    targetAudience: z.string().optional(),
    keyMessage: z.string().optional(),
    industry: z.string().optional(),
    geography: z.string().optional(),
    brandVoice: z.string().optional(),
    timing: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    brief: z.string().optional(),
});
