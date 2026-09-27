import { z } from "zod";

/** Path parameters of `GET /v3/merchant/google/sellers/ad_url/{shop_ad_aclk}`. */
export const zGoogleShoppingSellerAdUrlPathParams = z.object({
    shop_ad_aclk: z.string().min(1).max(2000).describe(
        "The shop_ad_aclk value from a google-shopping-sellers row.",
    ),
}).strict();
