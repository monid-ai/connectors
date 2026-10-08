import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsPipeAgenticSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/jobs/agentic-search` — a plain-language request, planned into
 * structured searches, scored and ranked; billed like search, one credit
 * per posting returned (the vendor's `credits_charged` claim settles).
 *
 * `limit` is REQUIRED at the binding (design D25): the vendor defaults it
 * to 10, but it is the estimate's whole basis.
 */
export default defineEndpoint({
    meta: {
        displayName: "Agentic Job Search",
        summary: "Find the best-matching job postings from a plain-language " +
            "request.",
        description: 'Takes a request in plain language ("senior backend ' +
            'engineer in Berlin, visa sponsorship, hybrid ok"), plans ' +
            "structured searches from it, checks hard constraints (place, " +
            "pay, dates) on the stored records, scores every candidate " +
            "posting against the request from its text, and returns the " +
            "best-matching postings first with a relevance score on each, " +
            "plus the plan it ran (metadata.agentic: intent, rounds, why " +
            "it stopped). Optional `filters` pin hard constraints in the " +
            "filter names of jobspipe#v1/jobs/search. Use it when the " +
            "caller has a sentence rather than filters; use " +
            "jobspipe#v1/jobs/search when the filters are already known — " +
            "it is faster and pages. Slower (typically 5–15 s), at most " +
            "25 postings per call and 10 calls a minute per account. One " +
            "credit per posting returned; postings this account already " +
            "paid for this month are free.",
        docsUrl: "https://docs.jobspipe.dev/api-reference/jobs-search",
        categories: ["jobs"],
        notes: [
            "The page is the answer, not a window: metadata.total_results " +
            "and next_cursor are always null, and paging or ordering keys " +
            "inside filters are rejected.",
            "A 503 means the agentic search is switched off upstream; " +
            "fall back to jobspipe#v1/jobs/search.",
        ],
    },
    request: { method: "POST", path: "/v1/jobs/agentic-search" },
    input: {
        schema: {
            body: zJobsPipeAgenticSearchBody.required({ limit: true }),
        },
    },
    // the vendor documents 5–15 s typical and "up to about 30 when a
    // second planning round is needed", asking clients to set timeouts
    // accordingly (docs.jobspipe.dev/api-reference/agentic-search): the
    // provider's 30 s would cut exactly those calls, so 45 s here
    timeouts: { requestMs: 45_000, runMs: 45_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "postings",
            consumes: { credit: "default", amount: 1 },
            description: "one credit per posting returned; postings already " +
                "paid for this calendar month are free",
        },
        /** The caller-stated limit IS the posting promise (design D25). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.limit },
        }),
    },
});
