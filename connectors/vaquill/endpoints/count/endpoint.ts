import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStatuteCountBody } from "./schema/inputs.ts";

/**
 * `POST /us/statutes/count`: how many sections are in a scope.
 *
 * ANSWERED-OR-REFUNDED at 1 credit. Measured live 2026-09-17: a real scope
 * billed 1, and a scope that holds nothing returned 200 with `count: 0` and
 * billed 0. Counted 1 or 0 for the same reason the other lookups are: a
 * flat fold would bill for a refunded call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Count US Statute Sections",
        summary: "How many sections a scope contains.",
        description: "Count the sections in a scope without retrieving " +
            "them: a whole corpus, a jurisdiction, a title, a code, a " +
            "chapter, a CFR part, or only those carrying a given status. " +
            "The cheap way to size a job before running it, to check " +
            "coverage of a jurisdiction you are about to rely on, or to " +
            "audit how much of a code is repealed. The response says " +
            "whether the count is exact and echoes the scope it counted. " +
            "A scope that holds nothing is refunded.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/count-the-sections-in-a-scope",
        categories: ["legal-research"],
    },
    request: { method: "POST", path: "/us/statutes/count" },
    input: { schema: { body: zStatuteCountBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "answered count",
            description:
                "one per call that counts a non-empty scope; an empty " +
                "scope is refunded",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalNum(data.output, "$.count") ?? 0;
            return { counts: { RESULT: found > 0 ? 1 : 0 } };
        },
    },
});
