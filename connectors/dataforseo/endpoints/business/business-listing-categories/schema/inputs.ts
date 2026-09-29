import { z } from "zod";
import { zFilters, zLimit, zOffset } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/business_listings/categories_aggregation/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBusinessListingCategoriesBody = z.object({
    categories: z.array(z.string().min(1)).describe(
        "Business categories",
    ).optional(),
    description: z.string().min(1).describe(
        "Description of the element in SERP",
    ).optional(),
    title: z.string().min(1).describe(
        "Title of the element in SERP",
    ).optional(),
    is_claimed: z.boolean().describe(
        "Indicates whether the business is verified by its owner on Google Maps",
    ).optional(),
    location_coordinate: z.string().min(1).describe(
        "GPS coordinates of a location (e.g. 53.476225,-2.243572,200)",
    ).optional(),
    initial_dataset_filters: zFilters,
    internal_list_limit: z.number().int().min(1).describe(
        "Maximum number of elements within internal arrays (default 10)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
}).strict();
