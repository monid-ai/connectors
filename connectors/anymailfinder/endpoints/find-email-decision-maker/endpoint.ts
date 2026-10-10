import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zFindDecisionMakerEmailBody } from "./schema/inputs.ts";

/** POST /find-email/decision-maker - the decision maker in a department
 *  at a company, with their verified email. */
export default defineEndpoint({
    meta: {
        displayName: "Find Decision Maker's Email",
        summary: "Find the decision maker in a department at a company - " +
            "name, title, LinkedIn URL and verified email.",
        description: "When you know the company but not the person: give " +
            "a company (domain or name) and one to five departments in " +
            "priority order (ceo, finance, sales, marketing, …); the " +
            "first department that yields a verified email wins. Returns " +
            "ONE person - full, first and last name, job title, LinkedIn " +
            "URL - with `valid_email` (SMTP-verified live, catch-all " +
            "domains included), `email_status`, the matched " +
            "`decision_maker_category`, and the mail provider. A miss " +
            "costs nothing. Suited for account-based prospecting and for " +
            "reaching the right buyer at a target company. When you " +
            "already have the person's name, use /find-email/person.",
        docsUrl:
            "https://anymailfinder.com/email-finder-api/docs/find-decision-maker-email",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when `email_status` is `valid`.",
            "`decision_maker_category` is a department, not a free-text " +
            "job title - map a title to the nearest department first; " +
            "an unknown value is a 400 listing the accepted ones.",
        ],
    },
    request: { method: "POST", path: "/find-email/decision-maker" },
    input: {
        schema: {
            body: z.union([
                zFindDecisionMakerEmailBody.required({
                    domain: true,
                    decision_maker_category: true,
                }),
                zFindDecisionMakerEmailBody.required({
                    company_name: true,
                    decision_maker_category: true,
                }),
            ]).describe(
                "A company (domain or company_name) and one to five " +
                    "departments.",
            ),
        },
    },
    usage: {
        /** 2 credits per decision maker found with a verified email (the
         *  discovery step and the verification together); a miss is a free
         *  200. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "decision makers found",
            description:
                "decision makers found with a verified email (a miss " +
                "counts zero)",
            consumes: { credit: "default", amount: 2 },
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
