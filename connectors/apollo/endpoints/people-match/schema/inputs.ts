import { z } from "zod";

/**
 * POST /people/match query params — the vendor mirror
 * (docs.apollo.io/reference/people-enrichment, 2026-09-16). Apollo requires
 * nothing; every identifier is optional and more of them improve the
 * match. The binding in endpoint.ts adds OUR "at least one identifier"
 * rule as a union, and omits the asynchronous channels (phone reveal,
 * waterfall, webhook/poll) that this connector does not carry (design D2).
 */
export const zPeopleMatchQueryParams = z.object({
    first_name: z.string().min(1).describe(
        "First name; typically used with last_name.",
    ).optional(),
    last_name: z.string().min(1).describe(
        "Last name; typically used with first_name.",
    ).optional(),
    name: z.string().min(1).describe(
        "Full name (first and last separated by a space); replaces " +
            "first_name + last_name.",
    ).optional(),
    email: z.string().min(1).describe("Email address.").optional(),
    hashed_email: z.string().regex(/^([A-Fa-f0-9]{32}|[A-Fa-f0-9]{64})$/)
        .describe("MD5 or SHA-256 hash of the email address.").optional(),
    organization_name: z.string().min(1).describe(
        "Employer name, current or previous.",
    ).optional(),
    domain: z.string().min(1).describe(
        "Employer domain, current or previous (no www. or @), e.g. " +
            "'apollo.io'.",
    ).optional(),
    id: z.string().min(1).describe(
        "Apollo person id (from People Search).",
    ).optional(),
    linkedin_url: z.string().regex(/^https?:\/\/\S+$/).describe(
        "LinkedIn profile URL.",
    ).optional(),
    run_waterfall_email: z.boolean().describe(
        "Run email waterfall enrichment across configured vendors " +
            "(asynchronous; credits depend on the vendors).",
    ).optional(),
    run_waterfall_phone: z.boolean().describe(
        "Run phone waterfall enrichment across configured vendors " +
            "(asynchronous; credits depend on the vendors).",
    ).optional(),
    reveal_personal_emails: z.boolean().describe(
        "Also return personal emails (not revealed for people in " +
            "GDPR-compliant regions). Default false.",
    ).optional(),
    reveal_phone_number: z.boolean().describe(
        "Also return phone numbers, delivered asynchronously to webhook_url " +
            "or by polling. Default false.",
    ).optional(),
    webhook_url: z.string().regex(/^https:\/\/\S+$/).describe(
        "Where Apollo delivers asynchronous phone or waterfall results; " +
            "required with reveal_phone_number unless poll_only is true.",
    ).optional(),
    poll_only: z.boolean().describe(
        "Receive asynchronous results by polling the webhook result " +
            "endpoint instead of a webhook. Default false.",
    ).optional(),
}).strict();
