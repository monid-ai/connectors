import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixPeopleQueryBody } from "./schema/inputs.ts";

/** POST /v1/people/query — structured search over people, one credit per
 *  25 profile IDs returned. */
export default defineEndpoint({
    meta: {
        displayName: "Find People",
        summary: "Search 900M people with a structured boolean query.",
        description: "Search 900M people profiles with a boolean query " +
            "tree over the documented field list: job title, seniority, " +
            "function, company, company headcount and industry, location, " +
            "skills, education, languages, tenure and total experience. " +
            "Composers are all, any and not; same-record scopes " +
            "(has_experience, has_education, has_language) hold several " +
            "conditions against ONE sub-record, which is what separates " +
            "'a Director at Google' from 'a Director, and also once at " +
            "Google'. Returns encrypted string profile IDs and a `total`, " +
            "never record data: read the records with " +
            "metix#entity/v1/profiles/detail-by-id, 100 IDs at a time. " +
            "`total` is free to look at, so a filter can be narrowed " +
            "before paying to read anything. A valid query with no matches " +
            "is a 200 with an empty list and costs nothing. Charged per 25 " +
            "IDs returned.",
        docsUrl: "https://platform.metix.ai/docs/api/people",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v1/people/query" },
    // `size` REQUIRED at the binding (design D25 — the mirror stays the
    // faithful vendor contract, where it is optional and omitting it
    // returns 100): it is the estimate's whole basis, so the caller states
    // the cap. The 1-10000 bounds are the vendor's own.
    input: { schema: { body: zMetixPeopleQueryBody.required({ size: true }) } },
    usage: {
        /** `GET /contract` quota block for this route: `dynamicCost`
         *  ceil(successful_result_count / 25), counted off `profile_ids`,
         *  charged only on a 2xx with a non-empty result. Settle is
         *  inherited: the provider evidence counts the result array. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 25,
            label: "profile IDs",
            consumes: { credit: "default", amount: 1 },
        },
        /** The vendor's own `preflightMaxCost`: ceil(resolved_size / 25),
         *  read off the pre-toRequest validated input (design D25). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.size },
        }),
    },
});
