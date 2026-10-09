import { z } from "zod";
import { zDomain } from "../../../schema/common.ts";

/** GET /companies/find query — the vendor mirror (hunter.io
 *  api-documentation/v2#company-enrichment, 2026-09-17). */
export const zCompaniesFindQueryParams = z.object({
    domain: zDomain,
}).strict();
