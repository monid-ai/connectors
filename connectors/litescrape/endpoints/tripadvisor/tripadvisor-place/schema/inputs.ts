import { z } from "zod";
import {
    zTripadvisorDomain,
    zTripadvisorId,
    zTripadvisorLocale,
} from "../../../../schema/tripadvisor.ts";

/** GET /tripadvisor/place query params (litescrape.com/docs/tripadvisor-place, 2026-09-20). */
export const zTripadvisorPlaceQueryParams = z.object({
    place_id: zTripadvisorId.describe(
        "Positive Tripadvisor place id from a search result.",
    ),
    tripadvisor_domain: zTripadvisorDomain,
    locale: zTripadvisorLocale,
    currency: z.string().regex(/^[A-Z]{3}$/).describe(
        "Three-letter ISO currency for price fields. Default 'USD'.",
    ).optional(),
    geo_id: zTripadvisorId.describe(
        "Positive parent geography id.",
    ).optional(),
}).strict();
