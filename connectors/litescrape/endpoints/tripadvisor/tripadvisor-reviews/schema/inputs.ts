import { z } from "zod";
import {
    zTripadvisorDomain,
    zTripadvisorId,
    zTripadvisorLocale,
} from "../../../../schema/tripadvisor.ts";

/** GET /tripadvisor/reviews query params (litescrape.com/docs/tripadvisor-reviews, 2026-09-20). */
export const zTripadvisorReviewsQueryParams = z.object({
    place_id: zTripadvisorId.describe(
        "Positive Tripadvisor place id from a search result.",
    ),
    tripadvisor_domain: zTripadvisorDomain,
    locale: zTripadvisorLocale,
    start: z.number().int().min(0).max(10000).describe(
        "Review offset, 0-10,000. Default 0.",
    ).optional(),
    num: z.number().int().min(1).max(50).describe(
        "Number of reviews, 1-50. Default 10.",
    ).optional(),
    sort_by: z.enum(["recent", "relevance"]).describe(
        "Chronological or machine-ranked order. Default 'recent'.",
    ).optional(),
    translate: z.boolean().describe(
        "Request Tripadvisor machine translation into the locale.",
    ).optional(),
}).strict();
