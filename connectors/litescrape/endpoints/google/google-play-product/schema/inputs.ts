import { z } from "zod";
import {
    zPlayLocale,
    zPlayProductId,
    zPlayStore,
} from "../../../../schema/google-play.ts";

/** GET /google/play/product query params (litescrape.com/docs/google-play-product, 2026-09-20). */
export const zGooglePlayProductQueryParams = z.object({
    product_id: zPlayProductId.describe(
        "Native Google Play product identifier, such as 'com.duolingo'.",
    ),
    store: zPlayStore.describe(
        "Product catalog containing this identifier. Default 'apps'.",
    ).optional(),
    season_id: zPlayProductId.describe(
        "Native season identifier, such as 'tvseason-OVPad1njPzI.P'. Requires store 'tv'.",
    ).optional(),
    ...zPlayLocale,
}).strict();
