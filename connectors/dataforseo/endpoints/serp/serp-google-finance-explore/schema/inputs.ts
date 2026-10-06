import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/finance_explore/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleFinanceExploreBody = z.object({
    ...zLocaleFields,
    device: z.string().min(1).describe("Device type").optional(),
    os: z.string().min(1).describe(
        "Device operating system (values: windows)",
    ).optional(),
    news_type: z.string().min(1).describe(
        "Financial news filters (default top_stories; values: top_stories, local_market, world_markets)",
    ).optional(),
}).strict();
