import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHuggingfaceHubSearchApiBody } from "./schema/inputs.ts";
import { zHuggingfaceHubSearchApiOutput } from "./schema/output.ts";

/**
 * conserving_celerytop/huggingface-hub-search-api: Search Hugging Face Hub. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Hugging Face Hub",
        summary: "Search Hugging Face models, datasets, Spaces, and daily " +
            "papers with downloads, likes, task, and license.",
        description: "Searches the public Hugging Face Hub for models, " +
            "datasets, Spaces, or daily papers and returns one flat row " +
            "per result. Rows carry downloads, likes, trending score, " +
            "task, library, license, languages, tags, and dates, plus " +
            "parameter counts for models, SDK and hardware for Spaces, " +
            "and upvotes and linked GitHub repositories for papers. " +
            "Filter by owner, task, license, language, library, Space " +
            "SDK, or tags, and rank by downloads, likes, trending score, " +
            "creation date, or last modification. Public metadata only, " +
            "no Hugging Face account or token needed.",
        docsUrl:
            "https://apify.com/conserving_celerytop/huggingface-hub-search-api",
        categories: ["huggingface"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22):
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/conserving_celerytop/huggingface-hub-search-api",
    request: {
        method: "POST",
        path: "/v2/acts/conserving_celerytop~huggingface-hub-search-api/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob: required at the
            // binding (even though the actor publishes default 100): the
            // estimate must be deducible to price the hold (D24/D25)
            body: zHuggingfaceHubSearchApiBody.required({ maxItems: true }),
        },
    },
    // Published dataset VIEWS + a real run (the actor publishes no
    // storages.dataset.fields): passthrough DOCUMENTATION: non-strict,
    // all-optional, so catalogs and agents see the output shape while
    // vendor drift can never fail a paid run.
    output: { schema: zHuggingfaceHubSearchApiOutput },
    usage: {
        /** The WHOLE published card (design D29): the actor-start flat
         *  fee plus the one primary per-result event. Business-tier
         *  (API tier code GOLD) rates, pinned from the actor's published
         *  pricingInfo (2026-10-04). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys: the actor's
            // charge-event names normalize onto them (strip apify-
            // prefix, kebab/camel → snake), which is the drift
            // guard's derived join (design D28)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // $0.00005 per GB × the actor's 256 MB default
                    // memory (the event bills one per GB, minimum one,
                    // so a 256 MB run is exactly one event)
                    consumes: { credit: "default", amount: 0.00005 },
                },
                search_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results",
                    description: "one Hub result (model, dataset, Space, or " +
                        "paper) saved to the dataset; a search with no " +
                        "matches saves one message row, also charged once",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0021 },
                },
            },
        },
        /** maxItems caps the run (required at the binding, so the
         *  estimate is pure arithmetic, no fallbacks: D24). A paper
         *  search returns at most 120 rows (the actor's own input
         *  description), so the paper estimate is capped there. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    search_result: body.resource === "papers"
                        ? Math.min(body.maxItems, 120)
                        : body.maxItems,
                },
            };
        },
    },
});
