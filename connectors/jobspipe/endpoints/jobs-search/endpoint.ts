import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsPipeJobSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/jobs/search` — filter search over the live corpus, one credit
 * per posting returned, plus one per posting that names a technology when
 * `include_technologies` is set (the vendor's second line, reported in
 * `metadata.technologies_credits_charged` and folded into
 * `credits_charged`).
 *
 * Two components, both 1 credit per RESULT: `postings` counts the rows
 * minus `jobs_already_paid`; `technologies` counts the rows that carry a
 * non-empty `technologies` array minus `technologies_already_paid`. The
 * estimate promises `limit` postings and, with the opt-in, `limit`
 * technology lines (the ceiling: every returned job could name one).
 *
 * `limit` is REQUIRED at the binding (design D25 — the mirror stays the
 * faithful vendor contract, optional with vendor default 25): it is the
 * estimate's whole basis, so the caller states the cap. The bill itself is
 * the vendor's `metadata.credits_charged` claim (provider consolidate),
 * which the fold is built to agree with.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Jobs",
        summary: "Search live job postings with structured filters.",
        description: "Search live job postings from 30+ job boards, " +
            "employment services and company career sites, normalized " +
            "into one schema. Every filter is optional and they combine " +
            "with AND; array filters ending in _or match any value, _not " +
            "exclude. Filter by title or description phrases, country, " +
            "city or region, US metro, remote / hybrid / onsite, seniority, " +
            "employment type, posting language, source board, skills or " +
            "ESCO skill ids, ISCO occupation and ISIC industry codes, " +
            "company name, headcount, revenue or technologies used, visa " +
            "stance, benefits, applicant count, recruiter email presence, " +
            "posted salary in USD, ghost-job score, posting date and the " +
            "date JobsPipe first discovered it (poll discovered_at_gte " +
            "with your last run time for only-new postings). Each posting " +
            "returns title, company with domain, location, arrangement, " +
            "seniority, annualized salary, skills, occupation and " +
            "industry codes, status and the source URL. Pages via " +
            "metadata.next_cursor. Unknown filter names are rejected, not " +
            "ignored. Reach for jobspipe#v1/jobs/agentic-search when you " +
            "have a sentence rather than filters, and " +
            "jobspipe#v1/companies/{key} for the full record of one " +
            "employer. One credit per posting returned; a posting this " +
            "account already paid for this month is free; an empty " +
            "result costs nothing. include_technologies adds the graded " +
            "technologies each posting names for one extra credit per " +
            "returned job that names at least one, once per job per " +
            "month.",
        docsUrl: "https://docs.jobspipe.dev/api-reference/jobs-search",
        categories: ["jobs"],
        notes: [
            "Only [{field: 'posted_at', desc: true}] is accepted in " +
            "order_by — every response is already newest-first; any " +
            "other sort is a 400.",
            "employment_type_or, job_seniority_or and work_arrangement_or " +
            "drop postings whose value is unknown (27%, 55% and a " +
            "sizeable share respectively); add the field to " +
            "include_unknown to keep them.",
            "metadata.total_results is null unless include_total_results " +
            "is set; counting is extra latency, not extra credits.",
        ],
    },
    request: { method: "POST", path: "/v1/jobs/search" },
    input: {
        schema: { body: zJobsPipeJobSearchBody.required({ limit: true }) },
    },
    usage: {
        /** "One credit is one job returned" plus the technologies line —
         *  both from the provider's single pool. The provider consolidate
         *  lifts `credits_charged` (which already includes the technology
         *  credits) as the claim; the evidence below folds the two
         *  components to agree with it. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                postings: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "postings",
                    consumes: { credit: "default", amount: 1 },
                    description: "one credit per posting returned; " +
                        "postings already paid for this calendar month " +
                        "are free",
                },
                technologies: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "technology lines",
                    consumes: { credit: "default", amount: 1 },
                    description: "with include_technologies, one extra " +
                        "credit per returned posting that names at least " +
                        "one technology; free again for the rest of the " +
                        "month once paid",
                },
            },
        },
        /** The caller-stated limit IS the posting promise (typed read of
         *  the pre-toRequest validated input — design D25); the opt-in
         *  doubles the ceiling, since every returned job may name a
         *  technology. The plan cap may clamp it lower; the vendor claim
         *  settles the truth. */
        estimate: ({ data }) => ({
            counts: {
                postings: data.input.body.limit,
                technologies: data.input.body.include_technologies === true
                    ? data.input.body.limit
                    : 0,
            },
        }),
        /** Both components read off the response: billable postings are
         *  the rows minus the vendor's already-paid count; billable
         *  technology lines are the rows whose `technologies` is
         *  non-empty minus `technologies_already_paid` (absent, as is the
         *  field itself, unless include_technologies was set). */
        evidence: ({ data, utils }) => {
            const rows = utils.json.optionalLen(data.output, "$.data") ?? 0;
            const paid = utils.json.optionalNum(
                data.output,
                "$.metadata.jobs_already_paid",
            ) ?? 0;
            const techPaid = utils.json.optionalNum(
                data.output,
                "$.metadata.technologies_already_paid",
            ) ?? 0;
            let named = 0;
            for (let i = 0; i < rows; i++) {
                const n = utils.json.optionalLen(
                    data.output,
                    `$.data[${i}].technologies`,
                ) ?? 0;
                if (n > 0) named++;
            }
            return {
                counts: {
                    postings: Math.max(0, rows - paid),
                    technologies: Math.max(0, named - techPaid),
                },
            };
        },
    },
});
