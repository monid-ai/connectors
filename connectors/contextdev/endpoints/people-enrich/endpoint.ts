import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeopleEnrichBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Enrich Person",
        summary:
            "Enrich a person from identity clues into one scored, normalized profile.",
        description: "Turn additive identity clues — social profile URLs, " +
            "a name plus company, a work email, education, or location — " +
            "into the best person candidate with an identity match score " +
            "from 0 to 100. Returns name, current role with organization " +
            "and dates, full experience and education history, skills, " +
            "bio, avatar, location, and social and website URLs, or a " +
            "clean not_found result to branch on. All supplied clues are " +
            "considered together, so more clues mean a stronger match. " +
            "Suited for CRM enrichment, lead qualification, signup " +
            "intelligence, and candidate research.",
        docsUrl: "https://docs.context.dev/api-reference/people/enrich",
        categories: ["people-enrichment"],
        // The minimum-clue rule is NOT here: it survives into the compiled
        // input schema as an `anyOf` (clay D13).
        notes: [
            "A not_found result draws nothing; free and disposable email " +
            "addresses are rejected upstream with a 422 at no charge.",
        ],
    },
    request: { method: "POST", path: "/people/enrich" },
    // The vendor's minimum-clue rule — an email, a social profile URL, or
    // a name plus company, education, or location — bound as a union so it
    // survives compilation as `anyOf` (clay D13; v1 enforced it with a
    // `.refine` that would compile to nothing here).
    input: {
        schema: {
            body: z.union([
                zPeopleEnrichBody.required({ email: true }),
                zPeopleEnrichBody.required({ social_urls: true }),
                zPeopleEnrichBody.required({ name: true, company: true }),
                zPeopleEnrichBody.required({ name: true, education: true }),
                zPeopleEnrichBody.required({ name: true, location: true }),
            ]).describe(
                "Provide an email, a social profile URL, or a name plus " +
                    "company, education, or location.",
            ),
        },
    },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 20 credits per FOUND person — https://www.context.dev/pricing
         *  (2026-09-17, "per call") with the vendor's own meter reporting
         *  0 on a not_found (v1 drill 2026-08-21), so the count is the
         *  candidate, not the call. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "people found",
            description: "candidates resolved (match.status candidate)",
            consumes: { credit: "default", amount: 20 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT:
                    utils.json.optionalGet(data.output, "$.match.status") ===
                            "candidate"
                        ? 1
                        : 0,
            },
        }),
    },
});
