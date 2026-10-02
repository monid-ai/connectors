import { defineProvider, presets } from "@shared/core";

/**
 * Anymail Finder (anymailfinder.com) - B2B work-email finding and
 * verification. Four endpoints against `https://api.anymailfinder.com/v5.1`,
 * the API key raw in `Authorization` (no scheme prefix), billed in Anymail
 * Finder credits (one pool for finds and verifications - v5.1
 * `GET /account` `credits_left`).
 *
 * Every address a find returns was SMTP-verified live before the
 * response, catch-all domains included. Billing (anymailfinder.com/pricing
 * and the per-endpoint API docs, 2026-10-02; vendor-verified live): a
 * person find costs 1 credit and a decision-maker find 2, only when
 * `email_status` is `valid`; a company find costs 1 for the whole list,
 * only when verified addresses come back; a verification costs 0.2
 * whatever the verdict. A miss is a 200 with `email_status: "not_found"`
 * (never a 404) and is free. An exact repeat of a find or verification
 * within 30 days is free upstream.
 *
 * Every billable response carries `credits_charged` - the vendor's own
 * meter for that call - so the provider declares ONE consolidate that
 * reads it as the claim and strips it from the output (design D27); each
 * endpoint states its own evidence. A 30-day repeat reports
 * `credits_charged: 0`, which prunes to an empty claim and settles the
 * derived fold (the published rate), surfaced as a mismatch.
 */
export default defineProvider({
    name: "anymailfinder",
    meta: {
        displayName: "Anymail Finder",
        summary: "Find and verify B2B work emails - charged only for " +
            "verified results.",
        description: "Anymail Finder - verified work emails for agents: " +
            "find a person's email from their name and company or from " +
            "a LinkedIn URL, find the decision maker in a department at a " +
            "company (name, title, LinkedIn URL and email) when you do not " +
            "know who to look for, list the verified addresses at a " +
            "company, and verify an address you already hold. Every " +
            "address returned was SMTP-verified live, catch-all domains " +
            "included; misses are free.",
        homepageUrl: "https://anymailfinder.com",
        docsUrl: "https://anymailfinder.com/email-finder-api/docs",
        categories: ["people-enrichment"],
        notes: [
            "A find answers HTTP 200 with `email_status` `valid`, " +
            "`risky`, `not_found` or `blacklisted`; only `valid` is a " +
            "verified, deliverable address and only `valid` is charged. " +
            "Read `valid_email`, not `email`: a `risky` address is " +
            "returned in `email` only and was not verified.",
            "Real-time SMTP checks: most calls answer in a few seconds, " +
            "a slow target mail server can take up to 180 s.",
            "Errors are `{error, message}`: 400 `bad_request` (the " +
            "message names the missing field), 401 `unauthorized`, 402 " +
            "`upgrade_needed` (no credits left) - all settle with zero " +
            "usage.",
            "An exact repeat of a find or verification within 30 days " +
            "is free upstream and reports `credits_charged: 0`.",
        ],
    },
    auth: { inject: presets.auth.header("Authorization") },
    request: { baseUrl: "https://api.anymailfinder.com/v5.1" },
    timeouts: { requestMs: 185_000, runMs: 190_000 },
    usage: {
        /** ONE pool: Anymail Finder credits - finds and verifications
         *  draw on the same balance. */
        credits: { default: { label: "Anymail Finder credits" } },
        /** The vendor's own meter, `credits_charged`, is the CLAIM (read
         *  + strip in one motion, design D27). Omitted when absent - the
         *  derived fold then settles, never a silent zero. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_charged",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Anymail Finder's error envelope `{error, message}` →
         *  `{message, error_code, raw}` (design D4). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Anymail Finder API error",
                ...(typeof code === "string" ? { error_code: code } : {}),
                raw: data.output,
            };
        },
    },
});
