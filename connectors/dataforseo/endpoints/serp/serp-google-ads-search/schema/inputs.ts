import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/ads_search/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleAdsSearchBody = z.object({
    advertiser_ids: z.array(z.string().min(1)).min(1).max(20).describe(
        "Advertiser ids from google-ads-advertisers (1-20).",
    ),
    target: z.string().min(1).describe("Domain name").optional(),
    ...zLocaleFields,
    depth: zDepth(700, 40, 40),
    platform: z.string().min(1).describe(
        "Advertising platform (default all; values: all, google_play, google_maps, google_search, google_shopping, youtube)",
    ).optional(),
    format: z.string().min(1).describe(
        "Ad format (values: all, text, image, video)",
    ).optional(),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
}).strict();
