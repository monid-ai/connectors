import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * `GET /us/statutes/coverage`: what is in the corpus, and how current.
 *
 * FREE, and the only vaquill response that carries no `creditsConsumed`
 * field at all: there is no meter because there is nothing to meter. The
 * provider consolidate omits the claim and the FREE model settles at zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "US Statutes Coverage",
        summary: "What the corpus covers, by jurisdiction and corpus type.",
        description: "The coverage matrix: which jurisdictions and which " +
            "bodies of law are in the corpus, how many sections each " +
            "holds, and how current our copy is. Free, and worth calling " +
            "before you build on a jurisdiction, because it answers " +
            "whether an empty search result means the law says nothing or " +
            "means we do not carry that corpus. Takes no parameters.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/coverage-matrix-by-jurisdiction-and-corpustype",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/us/statutes/coverage" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
