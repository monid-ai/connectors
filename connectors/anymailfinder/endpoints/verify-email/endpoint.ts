import { defineEndpoint, UsageModelKind } from "@shared/core";
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
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "verifications",
            consumes: { credit: "default", amount: 0.2 },
        },
    },
});
