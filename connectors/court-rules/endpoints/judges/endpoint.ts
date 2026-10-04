import { defineEndpoint } from "@shared/core";
import { zCourtRulesJudgesQuery } from "./schema/inputs.ts";

/**
 * Court Rules: list judges -
 * `GET https://api.courtrules.app/api/v1/judges`.
 *
 * The judge roster of a district (or of every covered court when
 * `district_id` is omitted) with the extracted-rules count each judge
 * carries. Pipe a returned `slug` into
 * `GET /api/v1/rules?judge_slug=...` for that judge's filing rules, or
 * into `POST /api/v1/check` to test a filing against them. Read-only,
 * and FREE: no meter, so usage settles at zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Court Rules: Judges",
        summary:
            "List the judges Court Rules covers for a district, with rule counts.",
        description:
            "Returns the judge roster of a district (or every covered " +
            "court when no district is given), each judge with the court " +
            "they sit on and how many filing rules are extracted for " +
            "them. Use the judge slug with the rules endpoint to read one " +
            "judge's standing order and individual practice, or with the " +
            "check endpoint to test a document against that judge's " +
            "requirements.",
        docsUrl:
            "https://docs.courtrules.app/api-reference/judges/list-judges",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/api/v1/judges" },
    input: { schema: { queryParams: zCourtRulesJudgesQuery } },
});
