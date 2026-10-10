import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zFindPersonEmailBody } from "./schema/inputs.ts";

/** POST /find-email/person - one person's verified work email. */
export default defineEndpoint({
    meta: {
        displayName: "Find Person's Email",
        summary: "Find a person's verified work email from their name and " +
            "company, or from a LinkedIn URL.",
        description: "Resolve a person (full name, or first + last) at a " +
            "company (domain or name) - or a LinkedIn profile URL on its " +
            "own - into their work email, SMTP-verified live before it is " +
            "returned, catch-all domains included. Returns `valid_email` " +
            "(set only when verified), `email_status` (valid / risky / " +
            "not_found / blacklisted), the mail provider (`mx_domain`, " +
            "`mx_host`), and the matched name, company and job title when " +
            "a LinkedIn profile was involved. A miss costs nothing. Suited " +
            "for completing a known person into a deliverable address and " +
            "for outreach list building. When you know the company but " +
            "not the person, use /find-email/decision-maker.",
        docsUrl:
            "https://anymailfinder.com/email-finder-api/docs/find-person-email",
        categories: ["people-enrichment"],
        notes: ["Charged only when `email_status` is `valid`."],
    },
    request: { method: "POST", path: "/find-email/person" },
    input: {
        schema: {
            // the vendor's rules - a company AND a person name, unless
            // linkedin_url carries both - as one union (clay D13)
            body: z.union([
                zFindPersonEmailBody.required({ linkedin_url: true }),
                zFindPersonEmailBody.required({
                    domain: true,
                    full_name: true,
                }),
                zFindPersonEmailBody.required({
                    domain: true,
                    first_name: true,
                    last_name: true,
                }),
                zFindPersonEmailBody.required({
                    company_name: true,
                    full_name: true,
                }),
                zFindPersonEmailBody.required({
                    company_name: true,
                    first_name: true,
                    last_name: true,
                }),
            ]).describe(
                "Identify the company (domain or company_name) and the " +
                    "person (full_name, or first_name + last_name), or " +
                    "send linkedin_url alone.",
            ),
        },
    },
    usage: {
        /** 1 credit per verified address found; a miss (`not_found`,
         *  `risky`, `blacklisted`) is a free 200. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verified emails found",
            description: "verified addresses found (a miss counts zero)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = `email_status` is `valid`; an explicit zero meter (a
         *  30-day repeat) counts zero so the pruned claim's fallback is
         *  free too. */
        evidence: ({ data, utils }) => {
            const status = utils.json.optionalGet(
                data.output,
                "$.email_status",
            );
            const charged = utils.json.optionalGet(
                data.output,
                "$.credits_charged",
            );
            return {
                counts: {
                    RESULT: status === "valid" && charged !== 0 ? 1 : 0,
                },
            };
        },
    },
});
