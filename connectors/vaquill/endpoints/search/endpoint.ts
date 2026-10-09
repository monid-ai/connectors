import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStatuteSearchBody } from "./schema/inputs.ts";

/**
 * `POST /us/statutes/search`: the entry point to the corpus.
 *
 * BASE-PLUS-BODIES billing: the vendor charges the search a flat 4 credits
 * whatever it returns, and `includeBody` adds the ordinary 6-credit body
 * price for each row that actually comes back with text. So a plain page of
 * 10 is 4, and the same page with bodies is 4 + 60 = 64.
 *
 * AN EMPTY PAGE IS FREE TO THE CALLER. Vaquill still charges the 4 (verified
 * live 2026-09-18: a phrase that matches nothing returned `results: []` and
 * `creditsConsumed: 4`); the broker absorbs it. So the `call` line is
 * metered, an answered page counted 1 or 0, and the endpoint's own
 * `consolidate` declines the vendor's claim on an empty page so the derived
 * fold settles at nothing (a flat line would fold to 4 regardless).
 *
 * The two halves are counted differently on purpose. The ESTIMATE can only
 * promise against `limit`, which is the caller's own ceiling. The EVIDENCE
 * counts rows whose `body` actually arrived, because a section whose text
 * cannot be resolved comes back `body: null` and is refunded, for the same
 * reason the vendor's own `creditsConsumed` is the claim that settles.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search US Statutes",
        summary: "Search US statutes, regulations, court rules and guidance.",
        description: "Hybrid semantic and keyword search across US primary " +
            "law: the United States Code, the Code of Federal Regulations, " +
            "all 50 state statutory codes plus DC and Puerto Rico, state " +
            "administrative codes, court rules, constitutions, the Federal " +
            "Register, agency guidance and executive actions. Phrase the " +
            "query the way a lawyer would ask it; `matchType` switches to " +
            "strict keyword or exact phrase when you need it. Filter by " +
            "jurisdiction, corpus, title, chapter, part, publisher, year, " +
            "or status, and use `changedSince` to poll for what moved. " +
            "Each hit carries its citation, its `actId`, an excerpt, and " +
            "its currency signals. Set `includeBody` to pull full text " +
            "inline instead of a second call per hit, and name `fields` to " +
            "cut a 140-field row down to what you actually read.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/search-us-statutes-constitutions-court-rules-and-executive-actions",
        categories: ["legal-research"],
        notes: [
            "`offset` + `limit` reaches 120 results at most. A query that " +
            "needs more depth wants a narrower filter, not a deeper page.",
            "`titleNumber` is meaningless for state corpora, whose titles " +
            "are alphabetic (Texas `pe` is the Penal Code). It is " +
            "ignored rather than rejected there.",
        ],
    },
    request: { method: "POST", path: "/us/statutes/search" },
    input: {
        schema: {
            // The vendor's own documented defaults, materialized at the
            // binding (design D25: the mirror carries optionality only).
            // `limit` and `includeBody` are the two the estimate reads, so
            // both must be deterministic after validation.
            body: zStatuteSearchBody.extend({
                limit: zStatuteSearchBody.shape.limit.unwrap().default(10),
                offset: zStatuteSearchBody.shape.offset.unwrap().default(0),
                includeBody: zStatuteSearchBody.shape.includeBody.unwrap()
                    .default(false),
                excerptChars: zStatuteSearchBody.shape.excerptChars.unwrap()
                    .default(500),
                matchType: zStatuteSearchBody.shape.matchType.unwrap()
                    .default("any"),
                excludeRepealed: zStatuteSearchBody.shape.excludeRepealed
                    .unwrap().default(false),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 4 },
                    label: "search",
                    description:
                        "the ranked search, however deep the page; a page " +
                        "that matches nothing is free",
                },
                body: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 6 },
                    label: "inline full text",
                    description: "one per hit that returns full text under " +
                        "includeBody, at the ordinary body price",
                },
            },
        },
        /** `limit` is the only body count a pre-run promise can read: it is
         *  the caller's own ceiling on rows. The settle counts what arrived
         *  instead, which is why a thin result set estimates high. The
         *  search line is promised at 1: a pre-run hook cannot know whether
         *  the corpus holds a match, and an empty page settles below. */
        estimate: ({ data }) => {
            const bodies = data.input.body.includeBody
                ? data.input.body.limit
                : 0;
            return {
                counts: { call: 1, ...(bodies > 0 ? { body: bodies } : {}) },
            };
        },
        /** `call` is 1 when the page holds at least one hit and 0 when it
         *  matched nothing. `body` counts rows whose text ACTUALLY arrived:
         *  `includeBody` on a hit whose text cannot be resolved returns
         *  `body: null`, and that row is refunded rather than billed. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(data.output, "$.results");
            const rows = Array.isArray(results) ? results : [];
            const bodies = rows.filter((row) =>
                row !== null && typeof row === "object" &&
                !Array.isArray(row) && typeof row.body === "string" &&
                row.body.length > 0
            ).length;
            return {
                counts: {
                    call: rows.length > 0 ? 1 : 0,
                    ...(bodies > 0 ? { body: bodies } : {}),
                },
            };
        },
        /** The provider-wide receipt strip, with one difference: on an empty
         *  page the vendor's 4-credit claim is NOT adopted. An empty claim
         *  falls back to the derived fold, which counts 0 answered pages,
         *  and the caller pays nothing for a search that found nothing. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsConsumed",
            );
            const hits = utils.json.optionalLen(data.output, "$.results") ?? 0;
            return {
                credits: {
                    ...(typeof value === "number" && hits > 0
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
