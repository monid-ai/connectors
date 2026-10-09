import { z } from "zod";
import { zCommaList } from "../../../schema/common.ts";

/** POST /multi-domain-search query — the vendor mirror (hunter.io
 *  api-documentation/v2#multi-domain-search, 2026-09-17; upstream Beta).
 *  The filters ride the QUERY STRING, there is no body. Provide at least
 *  one selecting filter — bound as a union in endpoint.ts (limit /
 *  search_after / per_domain alone select nothing). */
export const zMultiDomainSearchQueryParams = z.object({
    company_name: zCommaList("Company name(s) to match.").optional(),
    location: zCommaList(
        "Company location(s) as ISO 3166-1 alpha-2 country codes, e.g. 'US'.",
    ).optional(),
    industry: zCommaList(
        "Company industry(ies) as numeric IDs from " +
            "https://hunter.io/files/industries.json.",
    ).optional(),
    headcount: zCommaList(
        "Company size range(s).",
        "1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, " +
            "10001+",
    ).optional(),
    company_type: zCommaList(
        "Company type(s).",
        "educational, educational institution, government agency, non " +
            "profit, partnership, privately held, public company, self " +
            "employed, self owned, sole proprietorship",
    ).optional(),
    founded_year: zCommaList("Founding year(s), four digits.").optional(),
    technology: zCommaList(
        "Technology(ies) in use as slugs from " +
            "https://hunter.io/files/technologies.json.",
    ).optional(),
    department: zCommaList("Person department(s), e.g. 'executive'.")
        .optional(),
    seniority: zCommaList("Seniority level(s).", "junior, senior, executive")
        .optional(),
    type: z.enum(["personal", "generic"]).describe(
        "Only personal or generic addresses.",
    ).optional(),
    decision_maker: z.boolean().describe(
        "true → only decision makers; false → only non-decision-makers.",
    ).optional(),
    verification_status: zCommaList(
        "Verification status(es).",
        "valid, accept_all, unknown",
    ).optional(),
    required_field: zCommaList(
        "Required person field(s).",
        "full_name, position, phone_number",
    ).optional(),
    min_confidence: z.number().int().min(2).max(100).describe(
        "Minimum confidence score of the hidden address (2-100).",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Email rows per page. Default and max 100.",
    ).optional(),
    search_after: z.string().min(1).describe(
        "Pagination cursor: pass the previous response's " +
            "meta.next_search_after. Omit for the first page.",
    ).optional(),
    per_domain: z.boolean().describe(
        "Include a per-domain breakdown of matching email counts " +
            "(top 1,000 domains).",
    ).optional(),
}).strict();
