import { z } from "zod";
import { zCountry } from "./common.ts";

/**
 * Google Play (Alpha upstream, litescrape.com/docs/google-play-*,
 * 2026-09-20): the four storefront listings share one parameter grammar —
 * a query OR a category OR a chart OR one of three continuation tokens —
 * and the product / reviews readers share the product id and store
 * selector.
 */

/** `hl` / `gl` — the Play storefront locale. */
export const zPlayLocale = {
    hl: z.string().regex(/^[a-zA-Z]{2,3}(?:[-_][a-zA-Z0-9]{2,8}){0,3}$/).max(32)
        .describe(
            "Storefront language, such as 'en', 'de', or 'zh-TW'. Default 'en'.",
        ).optional(),
    gl: zCountry.describe("Two-letter country code. Default 'us'.").optional(),
};

/** A continuation token returned by a Play listing. */
export const zPlayToken = z.string().regex(/^[a-zA-Z0-9_=+/:.-]+$/).min(1).max(
    65536,
);

/** A native Play category or chart identifier. */
export const zPlayCategory = z.string().regex(/^[a-zA-Z0-9_-]+$/).min(1).max(
    128,
);

/** The listing controls shared by apps / games / books / movies. */
export const playListingShape = {
    q: z.string().min(1).max(2048).describe(
        "Search query, 1-2,048 bytes. Cannot be combined with a category or chart; omit it to browse the storefront.",
    ).optional(),
    ...zPlayLocale,
    chart: zPlayCategory.describe(
        "Chart identifier such as 'topselling_free', 'topselling_paid', or 'topgrossing'. Cannot be combined with q or the pagination tokens.",
    ).optional(),
    next_page_token: zPlayToken.describe(
        "Continue the listing with the returned next_page_token and the same parameters.",
    ).optional(),
    section_page_token: zPlayToken.describe(
        "Continue one result group with its returned token and the same parameters.",
    ).optional(),
    see_more_token: zPlayToken.describe(
        "Open a result collection with its returned token and the same parameters.",
    ).optional(),
};

export const zAge = z.enum(["AGE_RANGE1", "AGE_RANGE2", "AGE_RANGE3"]);

/** A native Play product id such as 'com.duolingo'. */
export const zPlayProductId = z.string().regex(/^[a-zA-Z0-9_.-]{1,512}$/);

export const zPlayStore = z.enum([
    "apps",
    "books",
    "audiobooks",
    "movies",
    "tv",
]);
