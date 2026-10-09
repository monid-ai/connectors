import { z } from "zod";

/** GET /people/{id} path params — the vendor mirror
 *  (docs.apollo.io/reference/get-complete-person-info, 2026-09-16). */
export const zPersonShowPathParams = z.object({
    id: z.string().min(1).describe(
        "Apollo person id (from People Search).",
    ),
}).strict();
