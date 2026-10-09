import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeopleMatchQueryParams } from "./schema/inputs.ts";

// The asynchronous channels are NOT carried (design D2): a phone or
// waterfall reveal answers with a signed 64-bit `request_id` that the
// engine's JSON decode rounds, so the readback could never find it. Omitted
// from the binding, `.strict()` rejects them before the wire instead of
// forwarding a paid request whose second half is unreachable.
const zMatchInput = zPeopleMatchQueryParams.omit({
    reveal_phone_number: true,
    webhook_url: true,
    poll_only: true,
    run_waterfall_email: true,
    run_waterfall_phone: true,
});

export default defineEndpoint({
    meta: {
        displayName: "Apollo People Enrichment",
        summary:
            "Enrich one person — verified email, title, employer, history — from an email, name, LinkedIn URL, or Apollo id.",
        description: "Resolve a known person into a complete profile: " +
            "verified work email, job title, seniority, department, " +
            "employment history, location, and current employer details. " +
            "Accepts any identifier — email, name plus company, LinkedIn " +
            "URL, or Apollo person id — and more identifiers improve the " +
            "match; match_confidence in the response says how sure Apollo " +
            "is (none = no record enriched). The step that reveals the " +
            "contact data People Search withholds; best for lead " +
            "enrichment, contact appending, and CRM hygiene. Phone numbers " +
            "are not available through this endpoint.",
        docsUrl: "https://docs.apollo.io/reference/people-enrichment",
        categories: ["people-enrichment"],
        // The at-least-one-identifier rule is NOT here: it survives into
        // the compiled input schema as an `anyOf` (clay D13).
        notes: [
            "Charged only when credit-consuming data is found: a " +
            "match_confidence of none with no email draws nothing.",
            "Personal emails are not revealed for people in GDPR-compliant " +
            "regions.",
            "A successful match costs 1 credit; reveal_personal_emails " +
            "adds no surcharge when no personal email is on file.",
        ],
    },
    request: { method: "POST", path: "/people/match" },
    // "At least one identifier" is OUR rule (Apollo requires nothing), so
    // it binds HERE and the mirror stays vendor-faithful (design D25). A
    // union is the form that SURVIVES compilation — it becomes `anyOf` with
    // a one-key `required` per arm, which ajv enforces pre-wire as
    // INVALID_INPUT; a `.refine` would be dropped silently and guard
    // nothing (clay D13).
    input: {
        schema: {
            queryParams: z.union([
                zMatchInput.required({ first_name: true }),
                zMatchInput.required({ last_name: true }),
                zMatchInput.required({ name: true }),
                zMatchInput.required({ email: true }),
                zMatchInput.required({ hashed_email: true }),
                zMatchInput.required({ organization_name: true }),
                zMatchInput.required({ domain: true }),
                zMatchInput.required({ id: true }),
                zMatchInput.required({ linkedin_url: true }),
            ]).describe(
                "Provide at least one person identifier: first_name, " +
                    "last_name, name, email, hashed_email, organization_name, " +
                    "domain, id, or linkedin_url. reveal_personal_emails is a " +
                    "modifier, not an identifier.",
            ),
        },
    },
    usage: {
        /** 1 credit per person when credit-consuming data is found —
         *  https://docs.apollo.io/docs/api-pricing (2026-09-16): "1 credit
         *  for demographics/email"; the +8 mobile-phone line is unreachable
         *  without the phone channel (design D2). The rate card lists NO
         *  surcharge for reveal_personal_emails (v1 charged +1 from an
         *  older card — design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "matched people",
            description: "people Apollo matched with demographics or an email",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Apollo's own rule (people-enrichment reference, 2026-09-16): the
         *  demographic credit follows `match_confidence` (none = no
         *  charge), the email credit does not — so a record with an email
         *  bills even at `none`. A no-match is a 200 whose `person` echoes
         *  the identifiers with `match_confidence: "none"` and no email. */
        evidence: ({ data, utils }) => {
            const person = utils.json.optionalGet(data.output, "$.person");
            if (
                person === null || person === undefined ||
                typeof person !== "object" || Array.isArray(person)
            ) {
                return { counts: { RESULT: 0 } };
            }
            const confidence = utils.json.optionalGet(
                person,
                "$.match_confidence",
            );
            const email = utils.json.optionalGet(person, "$.email");
            const matched =
                (typeof confidence === "string" && confidence !== "none") ||
                (typeof email === "string" && email !== "");
            return { counts: { RESULT: matched ? 1 : 0 } };
        },
    },
});
