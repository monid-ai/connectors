import { z } from "zod";
import {
    zCommaList,
    zCompanyName,
    zDomain,
    zLocationFilter,
} from "../../../schema/common.ts";

/** POST /domain-search body — the vendor mirror (hunter.io
 *  api-documentation/v2#domain-search, 2026-09-17). Upstream documents a
 *  GET, but the nested `location` filter is only honored in the JSON body
 *  v1 drill-verified (design D5). Provide at least one of domain or
 *  company — bound as a union in endpoint.ts. */
export const zDomainSearchBody = z.object({
    domain: zDomain.optional(),
    company: zCompanyName.optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Max email addresses to return. Default 10, max 100. Billing " +
            "is per started block of 10 returned addresses.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Addresses to skip — combine with limit to paginate " +
            "(meta.results is the total). Each page bills separately.",
    ).optional(),
    type: z.enum(["personal", "generic"]).describe(
        "Only personal (a person's own address) or generic (role-based, " +
            "e.g. contact@) addresses.",
    ).optional(),
    seniority: zCommaList(
        "Only people with the selected seniority level(s).",
        "junior, senior, executive",
    ).optional(),
    department: zCommaList(
        "Only people in the selected department(s).",
        "executive, it, finance, management, sales, legal, support, hr, " +
            "marketing, communication, education, design, health, " +
            "operations, product, research, consulting, administrative, " +
            "procurement",
    ).optional(),
    decision_maker: z.boolean().describe(
        "true → only likely decision makers; false → only " +
            "non-decision-makers.",
    ).optional(),
    required_field: zCommaList(
        "Only addresses whose person record has the selected field(s).",
        "full_name, position, phone_number",
    ).optional(),
    verification_status: zCommaList(
        "Only addresses with the selected verification status(es).",
        "valid, accept_all, unknown",
    ).optional(),
    job_titles: z.string().min(1).describe(
        "Only people with the selected job title(s), comma-delimited. " +
            "Common executive titles match their well-known equivalents " +
            "(CTO matches Chief Technology Officer, VP matches Vice " +
            "President).",
    ).optional(),
    location: zLocationFilter.describe(
        "Only people in (or not in) the given locations.",
    ).optional(),
    aggregations: z.boolean().describe(
        "Include a meta.aggregations breakdown: personal emails per " +
            "department, decision-maker count, personal/generic split.",
    ).optional(),
}).strict();
