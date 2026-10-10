import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixProfilesDetailBody } from "./schema/inputs.ts";

/** POST /entity/v1/profiles/detail-by-id — read people records for IDs a
 *  search returned, one credit per five records found. */
export default defineEndpoint({
    meta: {
        displayName: "Read People Records",
        summary: "Turn profile IDs from a search into full people records.",
        description: "Read full people records for encrypted string " +
            "profile IDs returned by metix#v1/people/query or " +
            "metix#v1/people-search, up to 100 IDs per request. A record " +
            "carries identity, headline, current title, seniority and " +
            "function, location, the full work history with company " +
            "firmographics and tenure, education, skills, languages, " +
            "awards, certifications, courses, publications and patents. " +
            "`_source` narrows the " +
            "record by field path: naming an object such as " +
            "experience.company returns everything under it, and false " +
            "returns the ID alone. An ID that resolves to nothing is " +
            "reported as not found and costs nothing. Charged per five " +
            "records found. Contact details are not part of a record and " +
            "are not available through this connector.",
        docsUrl: "https://platform.metix.ai/docs/api/people",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/entity/v1/profiles/detail-by-id" },
    // No tightening: `profile_ids` is a multiplier array the vendor
    // already bounds at 1-100, and a multiplier array is never tightened
    // (design D25). The estimate reads its length.
    input: { schema: { body: zMetixProfilesDetailBody } },
    usage: {
        /** `GET /contract` quota block: `dynamicCost`
         *  ceil(successful_record_count / 5), counted off `found`,
         *  charged only on a 2xx with a non-empty result. Settle is
         *  inherited from the provider evidence. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 5,
            label: "records",
            consumes: { credit: "default", amount: 1 },
        },
        /** The vendor's own `preflightMaxCost`:
         *  ceil(requested_record_count / 5) — every requested ID priced
         *  as though it resolves, which is the honest worst case. */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.profile_ids.length },
        }),
    },
});
