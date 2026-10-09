import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPerplexityBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "cloro Perplexity",
        summary:
            "Get Perplexity's answer and cited sources for a prompt, in a chosen country.",
        description: "Run a prompt on Perplexity, as a real user in a chosen " +
            "country, and get the answer as structured JSON: the answer " +
            "text and the cited sources, with optional markdown, HTML and " +
            "the raw streaming events. Use it to see whether and how " +
            "Perplexity mentions or cites a brand, a product or a page.",
        docsUrl:
            "https://cloro.dev/docs/api-reference/endpoint/monitor-perplexity",
        categories: ["ai-search", "geo"],
        notes: [
            "Billing: 6 credits per request (4 base + 2 sync " +
            "surcharge), plus 2 credits when state is set.",
        ],
    },
    request: { method: "POST", path: "/monitor/perplexity" },
    input: { schema: { body: zPerplexityBody } },
    // ASYNC RUN. Measured 36–45 s per call (monid drill,
    // 2026-09-22, and an end-to-end run, 2026-09-23). The run is async on
    // monid's side: start acknowledges it, and the first poll makes the one
    // /v1/monitor call. The poll is the provider's header relay.
    timeouts: { pollMs: 1_000 },
    lifecycle: {
        start: async () => ({ kind: "RUNNING" }),
        poll: async ({ utils }) => {
            const response = await utils.request();
            const raw = response.headers["x-credits-charged"];
            const parsed = raw !== undefined && /^\d+$/.test(raw.trim())
                ? Number(raw)
                : undefined;
            const creditsCharged =
                parsed !== undefined && Number.isSafeInteger(parsed)
                    ? parsed
                    : undefined;
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
                ...(creditsCharged !== undefined
                    ? { state: { data: { creditsCharged } } }
                    : {}),
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    description: "4 base credits + 2 sync surcharge",
                    consumes: { credit: "default", amount: 6 },
                },
                state_targeting: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "state targeting",
                    description: "US state geo-targeting (state is set)",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                ...(data.input.body.state !== undefined
                    ? { state_targeting: 1 }
                    : {}),
            },
        }),
        evidence: ({ data }) => ({
            counts: {
                ...(data.input.body.state !== undefined
                    ? { state_targeting: 1 }
                    : {}),
            },
        }),
    },
});
