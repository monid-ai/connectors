import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/tiktok/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zTiktokProductBody = z.object({
    url: siteUrl({
        site: "TikTok Shop",
        brands: ["tiktok"],
        example: "https://www.tiktok.com/shop/pdp/1731949430853767209",
    }),
    render: z.boolean().describe(
        "Render the page with JavaScript before extracting (default " +
            "false).",
    ).optional(),
}).strict();
