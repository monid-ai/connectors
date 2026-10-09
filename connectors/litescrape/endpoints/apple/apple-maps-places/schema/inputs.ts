import { z } from "zod";
import { zAppleLocale, zMuid } from "../../../../schema/apple.ts";

/** GET /apple/maps/places query params (litescrape.com/docs/apple-maps-places,
 *  2026-09-20). `muid` is an ARRAY here; the provider-level toRequest joins it
 *  with commas on the wire (`muid=a,b`), the form the vendor documents. */
export const zAppleMapsPlacesQueryParams = z.object({
    muid: z.array(zMuid).min(1).max(50).describe(
        "One to 50 Apple Maps place ids (unsigned 64-bit decimals as strings), such as ['4372355869446211302'].",
    ),
    locale: zAppleLocale,
}).strict();
