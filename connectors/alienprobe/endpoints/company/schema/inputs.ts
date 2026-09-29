import { z } from "zod";

/**
 * GET /v1/lookup/company query params — mirrored from the seller's live
 * OpenAPI (`lookup_company_by_query`, read 2026-09-29). The path form
 * `/v1/lookup/company/{q}` is the same door at the same price; the
 * connector speaks the query form only.
 */
export const zAlienprobeCompanyQueryParams = z.object({
    q: z.string().min(1).max(200).describe(
        "A company domain (apple.com), legal name, SEC CIK, stock ticker " +
            "or 20-character LEI, 1 to 200 characters. Detected by shape " +
            "unless `kind` names it: LEI pattern = lei, all digits = cik, " +
            "a dot = domain, 1-5 uppercase letters = ticker, else name.",
    ),
    kind: z.enum(["domain", "name", "cik", "ticker", "lei"]).describe(
        "Which identifier `q` is; overrides shape detection. Use it when " +
            "a short uppercase name would otherwise read as a ticker.",
    ).optional(),
}).strict();
