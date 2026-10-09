import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/autozone/category/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zAutozoneCategoryBody = z.object({
    url: siteUrl({
        site: "AutoZone",
        brands: ["autozone"],
        example:
            "https://www.autozone.com/batteries-starting-and-charging/battery",
    }),
    page: z.number().int().min(1).describe(
        "Results page number (1-indexed; default 1).",
    ).optional(),
    preferedstore: z.string().min(1).describe(
        "Preferred AutoZone store ID for local availability and pricing " +
            "(the upstream field name is spelled this way).",
    ).optional(),
}).strict();
