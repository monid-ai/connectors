import { z } from "zod";

/** GET /organizations/{id} path params — the vendor mirror
 *  (docs.apollo.io/reference/get-complete-organization-info, 2026-09-16). */
export const zOrganizationShowPathParams = z.object({
    id: z.string().min(1).describe(
        "Apollo organization id (from Organization Search).",
    ),
}).strict();
