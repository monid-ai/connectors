import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zChatgptBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "cloro ChatGPT",
        summary:
            "Get ChatGPT's answer, cited sources, shopping cards, entities and ads for a prompt, in a chosen country.",
        description: "Run a prompt on ChatGPT, as a real user " +
            "in a chosen country, with web search forced on, and get the " +
            "answer as structured JSON: the answer text, the cited sources " +
            "and citation pills, brand entities, and optionally the query " +
            "fan-out, shopping cards with prices and offers, and ads. Use " +
            "it to see whether and how ChatGPT mentions or cites a brand, " +
            "a product or a page. This is the ChatGPT consumer app, not " +
            "the OpenAI API: the answer is what a user sees.",
        docsUrl:
            "https://cloro.dev/docs/api-reference/endpoint/monitor-chatgpt",
        categories: ["ai-search", "geo"],
        notes: [
            "Billing: 7 credits per request (5 base + 2 sync surcharge), " +
            "plus 2 credits for the raw-data add-on (any of rawResponse, " +
            "searchQueries, ads, shopping), plus 2 credits when state is set.",
        ],
    },
    request: { method: "POST", path: "/monitor/chatgpt" },
    input: { schema: { body: zChatgptBody } },
    // ASYNC RUN. Measured 16–58 s per call, with one call at 91 s and one at 162 s (monid drill,
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
                    description: "5 base credits + 2 sync surcharge",
                    consumes: { credit: "default", amount: 7 },
                },
                raw_data: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "raw data",
                    description: "one shared add-on for rawResponse, " +
                        "searchQueries, ads and shopping",
                    consumes: { credit: "default", amount: 2 },
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
        estimate: ({ data }) => {
            const body = data.input.body;
            const include = body.include ?? {};
            const rawData = include.rawResponse === true ||
                include.searchQueries === true || include.ads === true ||
                include.shopping === true;
            return {
                counts: {
                    ...(rawData ? { raw_data: 1 } : {}),
                    ...(body.state !== undefined ? { state_targeting: 1 } : {}),
                },
            };
        },
        evidence: ({ data }) => {
            const body = data.input.body;
            const include = body.include ?? {};
            const rawData = include.rawResponse === true ||
                include.searchQueries === true || include.ads === true ||
                include.shopping === true;
            return {
                counts: {
                    ...(rawData ? { raw_data: 1 } : {}),
                    ...(body.state !== undefined ? { state_targeting: 1 } : {}),
                },
            };
        },
    },
});
