import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/product-reviews query params (ported from v1). */
export const zProductReviewsQueryParams = z.object({
    company: zCompany,
    products: z.array(z.string().min(1)).optional().describe(
        "product_id values to fetch reviews for (comma-separated on the " +
            "wire). Product IDs come from this same endpoint when called " +
            "without 'products'. If omitted, only the product list is " +
            "returned.",
    ),
    limit: z.number().int().min(1).max(50).optional().describe(
        "Maximum reviews to return per product (only applies when " +
            "'products' is provided). Max 50.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of reviews to skip before returning records (pagination).",
    ),
}).strict();
