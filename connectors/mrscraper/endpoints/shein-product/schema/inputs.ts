import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/commerce/shein/v4/detail/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zSheinProductBody = z.object({
    url: siteUrl({
        site: "Shein",
        brands: ["shein"],
        example: "https://us.shein.com/--p-98911792.html",
    }),
    render: z.boolean().describe(
        "Render the page with JavaScript to load dynamic content " +
            "(default false).",
    ).optional(),
}).strict();
