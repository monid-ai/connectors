import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixPeopleSearchBody } from "./schema/inputs.ts";

/** POST /v1/people-search — natural-language search over people. A flat
 *  AI-search base plus one credit per 25 profile IDs returned. */
export default defineEndpoint({
    meta: {
        displayName: "Find People by Description",
        summary: "Search 900M people with a natural-language description.",
        description: "Search 900M people profiles by describing the person " +
            "in plain language, for constraints that cannot be written as " +
            "fields. It reads the same index as the structured search and " +
            "returns the same encrypted string profile IDs, never record " +
            "data: read the records with " +
            "metix#entity/v1/profiles/detail-by-id, 100 IDs at a time. " +
            "Prefer metix#v1/people/query when the constraints ARE " +
            "expressible as fields: it costs less, because this endpoint " +
            "adds a flat AI-search base on top of the same per-25 result " +
            "price, and a structured query is reproducible while a " +
            "description is interpreted.",
        docsUrl: "https://platform.metix.ai/docs/api/people",
        categories: ["people-enrichment"],
        notes: [
            "The AI-search base is charged on every successful response, " +
            "including one that returns no IDs. The structured search at " +
            "metix#v1/people/query is free when it matches nothing.",
        ],
    },
    request: { method: "POST", path: "/v1/people-search" },
    // `size` REQUIRED at the binding — see people-query.
    input: {
        schema: { body: zMetixPeopleSearchBody.required({ size: true }) },
    },
    usage: {
        /** `GET /contract` quota block for this route: `dynamicCost`
         *  5 + ceil(successful_result_count / 25), charged on any 2xx
         *  (`chargeOn: 2xx`, NOT `2xx_with_non_empty_result` — the base
         *  is drawn even when the answer is empty). Two components, so
         *  the AND is COMPOSITE (design D19/D26): the base is the flat
         *  line the engine appends itself, and only the metered line is
         *  counted by the fns. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                ai_search_base: {
                    kind: UsageModelKind.PER_CALL,
                    label: "AI search base",
                    description: "drawn on every successful response, " +
                        "including one that returns no IDs",
                    consumes: { credit: "default", amount: 5 },
                },
                profile_ids: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    every: 25,
                    label: "profile IDs",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        /** `preflightMaxCost`: 5 + ceil(resolved_size / 25). Only the
         *  METERED component is reported: a flat line's quantity is
         *  structurally constant, so the engine appends it under its own
         *  component id and a fn that writes a flat key is rejected
         *  (design D24/D26). */
        estimate: ({ data }) => ({
            counts: { profile_ids: data.input.body.size },
        }),
        /** Overrides the provider default, which keys counts by UNIT for
         *  the leaf docs. A composite keys them by component id. */
        evidence: ({ data, utils }) => ({
            counts: {
                profile_ids:
                    utils.json.optionalLen(data.output, "$.data.profile_ids") ??
                        0,
            },
        }),
    },
});
