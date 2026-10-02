import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zVerifyEmailBody } from "./schema/inputs.ts";

/** POST /verify-email - live deliverability check of one address. */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email",
        summary: "Check whether an email address exists and can receive " +
            "mail, catch-all domains included.",
        description: "Live SMTP check of one address you already hold. " +
            "Returns `email_status`: valid (the mailbox accepts mail), " +
            "invalid (does not exist or does not accept mail), or risky " +
            "(the check could not determine either) - plus the mail " +
            "provider (`mx_domain`, `mx_host`), useful for skipping " +
            "addresses behind a security gateway. Works on catch-all " +
            "domains. Suited for pre-send list cleaning and bounce-rate " +
            "protection. Addresses returned by the find endpoints are " +
            "already verified and do not need this.",
        docsUrl: "https://anymailfinder.com/email-finder-api/docs/verify-email",
        categories: ["people-enrichment"],
        notes: [
            "0.2 credits per verification, whatever the verdict.",
        ],
    },
    request: { method: "POST", path: "/verify-email" },
    input: { schema: { body: zVerifyEmailBody } },
    usage: {
        /** 0.2 per verification whatever the verdict. PER_UNIT, not
         *  PER_CALL, so an explicit zero meter (a 30-day repeat) can count
         *  zero: the engine prunes the zero claim and settles this fold. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verifications",
            description: "verifications run (a free 30-day repeat counts zero)",
            consumes: { credit: "default", amount: 0.2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const charged = utils.json.optionalGet(
                data.output,
                "$.credits_charged",
            );
            return { counts: { RESULT: charged === 0 ? 0 : 1 } };
        },
    },
});
