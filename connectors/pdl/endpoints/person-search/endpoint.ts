import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zPdlPersonSearchVariants } from "./schema/inputs.ts";

const [zQueryVariant, zSqlVariant] = zPdlPersonSearchVariants;

/** POST /v5/person/search — Elasticsearch or SQL search, one credit per
 *  record returned. */
export default defineEndpoint({
    meta: {
        displayName: "Find People",
        summary: "Search the People Data Labs person dataset with " +
            "Elasticsearch or SQL queries.",
        description: "Search and filter the full People Data Labs person " +
            "dataset using Elasticsearch or SQL queries (provide one, not " +
            "both; Elasticsearch recommended). The query runs directly " +
            "against the Person Dataset without cleaning or preprocessing. " +
            "Build queries from any field in the Person Schema (name, job " +
            "title, company, location, skills, education, etc.); the " +
            "field descriptions in the Person Schema and the underlying " +
            "Elasticsearch Mapping are the reference for writing " +
            "effective queries. Returns " +
            "up to 100 matching person records per request with " +
            "scroll_token pagination; a valid query with no matches is a " +
            "200 with an empty data array. Charged per record retrieved.",
        docsUrl:
            "https://docs.peopledatalabs.com/docs/reference-person-search-api",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v5/person/search" },
    // `size` REQUIRED at the binding on BOTH variants (design D25 — the
    // mirror stays the faithful vendor contract, optional with vendor
    // default 1): it is the estimate's whole basis, so the caller states
    // it. The 1-100 bounds are the vendor's own.
    input: {
        schema: {
            body: z.union([
                zQueryVariant.required({ size: true }),
                zSqlVariant.required({ size: true }),
            ]),
        },
        /** v1 parity (reconcile 2026-09-16): v1 always materialized and
         *  sent `dataset=all`; PDL's server default is the narrower
         *  `resume`, so an omitting caller would silently search less
         *  than under v1. The default lives HERE, not on the union arms —
         *  JSON-Schema defaults never materialize inside `anyOf` — and an
         *  explicit caller value wins the merge. */
        toRequest: ({ data, utils }) => {
            // body IS schema-required on this doc, but the closed-term
            // envelope types `data.input.body` as `Json | undefined`
            // regardless — the ?? {} is a type guard, not dead code
            // (removing it fails `deno check`, TS2345; PR review)
            const body = data.input.body ?? {};
            const dataset = utils.json.optionalGet(body, "$.dataset");
            return {
                ...data.input,
                body: dataset === undefined
                    ? utils.json.merge(body, { dataset: "all" })
                    : body,
            };
        },
    },
    usage: {
        /** "Each person record in the data array of the response counts
         *  as a single credit" (PDL docs) — v1 makePerResultPrice(0.265),
         *  from the `people_search` pool (PDL's `x-call-credits-type:
         *  search`), declared on the provider. Settle is inherited: the
         *  provider evidence counts `data[]`. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            consumes: { credit: "people_search", amount: 1 },
        },
        /** The caller-stated size IS the record promise (typed read of the
         *  pre-toRequest validated input — design D25). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.size },
        }),
    },
});
