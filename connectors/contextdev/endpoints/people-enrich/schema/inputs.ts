import { z } from "zod";
import { zTimeoutOpts } from "../../../schema/common.ts";

/**
 * POST /people/enrich body — the vendor mirror
 * (docs.context.dev/api-reference/people/enrich, 2026-09-17): additive
 * identity clues, none required by the schema. The vendor's minimum-clue
 * rule ("an email, a social profile URL, or a name plus company,
 * education, or location") binds in endpoint.ts as a union. `tags` is not
 * carried.
 */

const zOrgRef = z.object({
    name: z.string().min(1).max(200).describe("Organization name.").optional(),
    domain: z.string().min(1).max(253).describe(
        "Organization website domain.",
    ).optional(),
}).strict();

export const zPeopleEnrichBody = z.object({
    social_urls: z.array(z.string().regex(/^https?:\/\/\S+$/)).min(1).max(20)
        .describe(
            "Person-profile URLs (LinkedIn, GitHub, X, personal site) — the " +
                "strongest clue. Up to 20.",
        ).optional(),
    name: z.object({
        first: z.string().min(1).max(100).describe("Given name."),
        last: z.string().min(1).max(100).describe("Family name."),
    }).strict().describe(
        "The person's name. On its own it is not enough — pair it with " +
            "company, education, or location.",
    ).optional(),
    email: z.string().max(320).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).describe(
        "WORK email address. Free-provider (gmail.com, yahoo.com) and " +
            "disposable addresses are rejected upstream with a 422 at no " +
            "charge.",
    ).optional(),
    company: zOrgRef.describe("Current or recent employer.").optional(),
    education: z.array(
        z.object({
            institution: zOrgRef.describe("School or university.").optional(),
            degree: z.string().min(1).max(200).describe(
                "Degree earned, e.g. 'BSc'.",
            ).optional(),
            field_of_study: z.string().min(1).max(200).describe(
                "Field of study, e.g. 'Computer Science'.",
            ).optional(),
            graduation_year: z.number().int().min(1900).max(2200).describe(
                "Graduation year.",
            ).optional(),
        }).strict(),
    ).min(1).max(10).describe("Education history clues. Up to 10 entries.")
        .optional(),
    location: z.object({
        city: z.string().min(1).max(200).optional(),
        region: z.string().min(1).max(200).optional(),
        country: z.string().min(1).max(200).optional(),
    }).strict().describe("Where the person lives or works.").optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();
