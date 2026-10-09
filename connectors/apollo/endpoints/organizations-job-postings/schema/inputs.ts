import { z } from "zod";

/** GET /organizations/{organization_id}/job_postings — the vendor mirror
 *  (docs.apollo.io/reference/organization-jobs-postings, 2026-09-16). */
export const zJobPostingsPathParams = z.object({
    organization_id: z.string().min(1).describe(
        "Apollo organization id of the company (from Organization Search).",
    ),
}).strict();

/** Apollo states no per-page bound here beyond its 10,000-record display
 *  limit per company. */
export const zJobPostingsQueryParams = z.object({
    page: z.number().int().min(1).describe(
        "Page of postings to retrieve (1-based).",
    ).optional(),
    per_page: z.number().int().min(1).describe(
        "Postings per page.",
    ).optional(),
}).strict();
