import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStatuteResolveBody } from "./schema/inputs.ts";

/**
 * `POST /us/statutes/resolve`: turn Bluebook citations into sections.
 *
 * The vendor bills PER CITATION SUBMITTED, miss included: verified live
 * 2026-09-17, one resolvable and one nonsense citation billed 4, with
 * `resolvedCount: 1`. THE CALLER PAYS PER CITATION RESOLVED. A miss is free
 * to the caller and the broker absorbs the vendor's 2 credits for it, so
 * the count that settles is `resolvedCount`, and the endpoint's own
 * `consolidate` adopts the vendor's claim only when every citation resolved
 * (the one case where the two figures agree). The ESTIMATE still promises
 * every distinct citation, because a pre-run hook cannot know which will
 * resolve; a batch with misses settles below it, never above.
 *
 * Vaquill also publishes a single-citation `GET` at this same path. It is
 * not ported: the batch form takes one citation just as happily, at the
 * same per-citation price, and two endpoints cannot share one identity.
 */
export default defineEndpoint({
    meta: {
        displayName: "Resolve US Citations",
        summary: "Resolve Bluebook citations to the sections they name.",
        description: "Resolve one or more Bluebook citations to the " +
            "sections they name, returning each section's `actId` and " +
            "metadata plus the pinpointed subsection where the citation " +
            "carries one. Handles federal and state forms: `42 U.S.C. " +
            "1983`, `16 C.F.R. 444.1`, `Tex. Penal Code 22.01`. Pass " +
            "`state` or `corpusType` to settle a form that is ambiguous " +
            "across jurisdictions. This is how a citation lifted out of a " +
            "brief, a contract or a model's output becomes something you " +
            "can fetch the text of and check the status of.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/resolve-many-citations-at-once",
        categories: ["legal-research"],
        notes: [
            "A citation that resolves to nothing is free: only resolved " +
            "citations bill. `resolved: false` on a result row reports " +
            "the miss.",
            "The cap is 50 UNIQUE citations, applied AFTER duplicates are " +
            "collapsed, so sixty repeats of one citation is one citation " +
            "and is accepted. The schema bounds the raw list at 500; the " +
            "post-collapse cap is the vendor's own 422.",
        ],
    },
    request: { method: "POST", path: "/us/statutes/resolve" },
    input: { schema: { body: zStatuteResolveBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 2 },
            label: "citations",
        },
        /** DISTINCT citations. The vendor collapses duplicates BEFORE it
         *  prices the batch, so counting the raw list would promise 120
         *  credits for sixty copies of one citation that bill 2 (verified
         *  live). `Set` is not a whitelisted closed-term global, so the
         *  distinct count is an indexOf filter over the array itself. */
        estimate: ({ data }) => {
            const cites = data.input.body.citations;
            return {
                counts: {
                    RESULT: cites.filter((cite, at) =>
                        cites.indexOf(cite) === at
                    ).length,
                },
            };
        },
        /** Citations that RESOLVED. `results` is one row per distinct
         *  citation whether or not it resolved; `resolvedCount` is the
         *  vendor's own count of the hits, and hits are what bill. */
        evidence: ({ data, utils }) => {
            const hits = utils.json.optionalGet(data.output, "$.resolvedCount");
            return {
                counts: { RESULT: typeof hits === "number" ? hits : 0 },
            };
        },
        /** The provider-wide receipt strip, with one difference: the
         *  vendor's claim covers every citation submitted, so it is adopted
         *  only when every citation resolved. With a miss in the batch the
         *  claim is declined and the derived fold, 2 per resolved citation,
         *  settles; the difference is the broker's cost. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsConsumed",
            );
            const hits = utils.json.optionalGet(data.output, "$.resolvedCount");
            const rows = utils.json.optionalLen(data.output, "$.results") ?? 0;
            return {
                credits: {
                    ...(typeof value === "number" && hits === rows
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
