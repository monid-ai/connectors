import { z } from "zod";
import { zCountry } from "./common.ts";

/** Apple App Store (Alpha upstream) and Apple Maps — shared identifiers
 *  (litescrape.com/docs/apple-*, 2026-09-20). */

/** Two-letter Apple storefront country. */
export const zAppStoreCountry = zCountry.describe(
    "Two-letter Apple storefront country, such as 'us' or 'gb' ('uk' is accepted). Default 'us'.",
).optional();

/** Positive decimal Apple app id, up to 20 digits — quoted, never a bare integer. */
export const zAppStoreProductId = z.string().regex(/^[1-9][0-9]{0,19}$/);

// Apple Maps place id — an unsigned 64-bit decimal, quoted as a string.
// The pattern enumerates the digit prefixes below 18446744073709551615 so
// the upper bound survives compilation (v1 enforced it with a `.refine`,
// which compiles to nothing).
export const zMuid = z.string().regex(
    /^(?:\d{1,19}|0\d{19}|1[0-7]\d{18}|18[0-3]\d{17}|184[0-3]\d{16}|1844[0-5]\d{15}|18446[0-6]\d{14}|184467[0-3]\d{13}|1844674[0-3]\d{12}|184467440[0-6]\d{10}|1844674407[0-2]\d{9}|18446744073[0-6]\d{8}|1844674407370[0-8]\d{6}|18446744073709[0-4]\d{5}|184467440737095[0-4]\d{4}|18446744073709550\d{3}|18446744073709551[0-5]\d{2}|1844674407370955160\d{1}|1844674407370955161[0-4]|18446744073709551615)$/,
);

export const zAppleLocale = z.string().regex(/^[a-zA-Z]{2,3}-[a-zA-Z]{2}$/)
    .describe(
        "Language-region locale such as 'en-US', 'fr-FR', 'ja-JP', or 'zh-TW'. Default 'en-US'.",
    ).optional();
