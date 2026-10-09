import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** GET /email-count query — the vendor mirror (hunter.io
 *  api-documentation/v2#email-count, 2026-09-17). Provide at least one
 *  of domain or company — bound as a union in endpoint.ts. */
export const zEmailCountQueryParams = z.object({
    domain: zDomain.optional(),
    company: zCompanyName.optional(),
    type: z.enum(["personal", "generic"]).describe(
        "Count only personal or only generic addresses.",
    ).optional(),
}).strict();
