import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zFindCompanyEmailsBody } from "./schema/inputs.ts";

/** POST /find-email/company - the verified addresses at a company. */
export default defineEndpoint({
    meta: {
        displayName: "Find Company Emails",
        summary: "List up to 20 verified email addresses at a company.",
        description: "List the email addresses known at a company (domain " +
            "or name): generic mailboxes such as info@ or sales@ and " +
            "individual employees' work addresses, filterable by type. " +
            "Returns up to 20 `emails`, the verified subset in " +
            "`valid_emails` (the ones to send to), `email_status`, and the " +
            "mail provider. Addresses only, no names. One credit for the " +
            "whole list, only when something is found. To reach a specific " +
            "person use /find-email/person; for a role, " +
            "/find-email/decision-maker.",
        docsUrl:
            "https://anymailfinder.com/email-finder-api/docs/find-company-email",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 credit per call, only when verified addresses are " +
            "returned - however many come back.",
        ],
    },
    request: { method: "POST", path: "/find-email/company" },
    input: {
        schema: {
            body: z.union([
                zFindCompanyEmailsBody.required({ domain: true }),
                zFindCompanyEmailsBody.required({ company_name: true }),
            ]).describe("Provide domain or company_name."),
        },
    },
    usage: {
        /** 1 credit per list that carries verified addresses. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "lists with verified emails",
            description:
                "calls that returned at least one verified address (an " +
                "empty list counts zero)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = `valid_emails` is a non-empty list; an explicit zero
         *  meter (a 30-day repeat) counts zero. */
        evidence: ({ data, utils }) => {
            const valid = utils.json.optionalGet(
                data.output,
                "$.valid_emails",
            );
            const charged = utils.json.optionalGet(
                data.output,
                "$.credits_charged",
            );
            return {
                counts: {
                    RESULT: Array.isArray(valid) && valid.length > 0 &&
                            charged !== 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
