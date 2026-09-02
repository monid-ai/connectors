import { z } from "zod";
import { zCompany } from "../../../schema/common.ts";

/** Akta /v1/company/employee-reviews query params (ported from v1). */
export const zEmployeeReviewsQueryParams = z.object({
    company: zCompany,
    limit: z.number().int().min(1).max(100).optional().describe(
        "Maximum number of reviews to return. Default 10, max 100.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of reviews to skip before returning records (pagination).",
    ),
}).strict();
