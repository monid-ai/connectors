import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDivisionsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /us/statutes/divisions`: walk the hierarchy.
 *
 * ANSWERED-OR-REFUNDED at 1 credit, which is what makes drilling
 * affordable: a walk from corpus to section is a handful of credits, and a
 * wrong turn costs nothing. Measured live 2026-09-17: a real level billed 1
 * and a title that does not exist returned 200 with an empty `divisions`
 * and billed 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Browse the Statutory Hierarchy",
        summary: "Walk a code's structure: titles, chapters, parts, sections.",
        description: "Browse a body of law by its own structure rather " +
            "than by search. Call it with just a `corpusType` to list the " +
            "titles or codes, then pass `titleNumber`, `code`, `chapter` " +
            "or `part` to drill a level at a time until you reach " +
            "sections. Each division reports how many sections sit under " +
            "it and whether it is a leaf, so you can size a subtree before " +
            "walking into it, and the `actId`s it returns feed straight " +
            "into search's `code` filter or the section endpoints. This is " +
            "the right tool when the question is 'what does this chapter " +
            "cover' rather than 'which section says X'. Deep listings page " +
            "with `nextCursor`, and a level that does not exist is " +
            "refunded.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/browse-the-statutory-hierarchy",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/us/statutes/divisions" },
    input: { schema: { queryParams: zDivisionsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "answered level",
            description:
                "one per call that returns at least one division; a level " +
                "that does not exist is refunded",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalLen(data.output, "$.divisions") ??
                0;
            return { counts: { RESULT: found > 0 ? 1 : 0 } };
        },
    },
});
