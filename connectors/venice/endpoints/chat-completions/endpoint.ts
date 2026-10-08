import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zChatCompletionsBody } from "./schema/inputs.ts";

/**
 * Venice `POST /chat/completions` — one blocking, non-streaming completion.
 *
 * Billing: Venice reports its own charge on every response as
 * `cost: {usd, diem}` (token prices for the chosen model, plus any web
 * search / scrape augmentation, plus cache discounts). That claim is
 * consolidated at provider level and WINS (design D27). There are ~150
 * text models with per-model, per-token and cached-token rates, so the
 * connector does not pin a rate card it would have to keep in sync;
 * instead the model meters the claim itself in nano-dollars (`Unit.CREDIT`
 * at $0.000000001 each), so the derived fold reproduces the claim exactly
 * and the per-run mismatch check stays silent.
 *
 * The estimate is a PROVABLE CEILING, not a guess: input bytes priced at
 * the highest published input rate ($12 / 1M tokens — a byte-level BPE
 * token consumes at least one byte), `max_completion_tokens` at the
 * highest output rate ($60 / 1M), plus $0.01 per enabled augmentation.
 * `max_completion_tokens` is therefore REQUIRED at the binding (the
 * primary limiting knob — D25); the settle trues down to the real cost.
 */
export default defineEndpoint({
    meta: {
        displayName: "Venice Chat Completions",
        summary: "Private or uncensored chat with ~150 open and frontier " +
            "models, with optional live web search.",
        description: "OpenAI-compatible chat completions on Venice. Pick " +
            "any Venice text model by id: Venice-hosted PRIVATE models " +
            "(prompts and outputs never stored or logged) — including " +
            "uncensored ones such as `venice-uncensored-1-2`, fast cheap " +
            "ones such as `z-ai-glm-5-3-flash`, and reasoning models such " +
            "as `kimi-k3` — or frontier models (Claude, Gemini, GPT, Grok) " +
            "proxied ANONYMIZED, without your identity. Supports system " +
            "prompts, multi-turn history, image input on vision models, " +
            "function calling, JSON-schema structured output, and " +
            "reasoning effort. `venice_parameters.enable_web_search` " +
            "grounds the answer in a live web search, and " +
            "`enable_web_scraping` reads URLs found in the prompt. Billed " +
            "at Venice's own reported cost for the call (`cost` on the " +
            "response). Use `venice#embeddings` for vectors and " +
            "`venice#augment/search` when you want raw search results " +
            "rather than an answer.",
        docsUrl:
            "https://docs.venice.ai/api-reference/endpoint/chat/completions",
        categories: ["text-generation", "ai-search"],
        notes: [
            "Non-streaming only: the run returns one complete response.",
            "`max_completion_tokens` is required here so the pre-run hold " +
            "is bounded; the bill is the reported cost, which is almost " +
            "always far below the hold.",
            "Model capabilities (vision, tools, structured output, " +
            "reasoning, X search) vary per model — check GET " +
            "/models?type=text on Venice before relying on one.",
        ],
    },
    request: { method: "POST", path: "/chat/completions" },
    input: {
        schema: {
            // PRIMARY limiting knob (D25): the estimate's whole basis.
            body: zChatCompletionsBody.required({
                max_completion_tokens: true,
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "nano-dollars",
            description: "Venice's reported cost for the call, in units " +
                "of $0.000000001",
            consumes: { credit: "default", amount: 0.000000001 },
        },
        /** Ceiling hold, in nano-dollars: UTF-8 bytes of every text part
         *  × $12/1M, `max_completion_tokens` × $60/1M, + $0.01 per
         *  enabled augmentation. Image parts are not counted (a vision
         *  model bills them in prompt tokens; the settle carries them). */
        estimate: ({ data }) => {
            let bytes = 0;
            for (const message of data.input.body.messages) {
                const content = "content" in message ? message.content : "";
                const parts = typeof content === "string"
                    ? [content]
                    : Array.isArray(content)
                    ? content.map((p) => p.type === "text" ? p.text : "")
                    : [];
                for (const text of parts) {
                    for (const ch of text) {
                        const cp = ch.codePointAt(0) ?? 0;
                        bytes += cp <= 0x7f
                            ? 1
                            : cp <= 0x7ff
                            ? 2
                            : cp <= 0xffff
                            ? 3
                            : 4;
                    }
                }
            }
            const vp = data.input.body.venice_parameters;
            const search = vp?.enable_web_search === "on" ||
                    vp?.enable_web_search === "auto"
                ? 10_000_000
                : 0;
            const scrape = vp?.enable_web_scraping === true ? 10_000_000 : 0;
            const xSearch = vp?.enable_x_search === true ? 10_000_000 : 0;
            return {
                counts: {
                    "CREDIT": bytes * 12_000 +
                        data.input.body.max_completion_tokens * 60_000 +
                        search + scrape + xSearch,
                },
            };
        },
        /** The vendor's reported cost, read off the RAW envelope and
         *  converted to whole nano-dollars (rounded, so float noise never
         *  over-bills). Absent ⇒ 0: money follows evidence. */
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalGet(data.output, "$.cost");
            const usd = cost === undefined || cost === null
                ? 0
                : utils.json.optionalNum(cost, "$.usd") ?? 0;
            const diem = cost === undefined || cost === null
                ? 0
                : utils.json.optionalNum(cost, "$.diem") ?? 0;
            return {
                counts: { "CREDIT": Math.round((usd + diem) * 1_000_000_000) },
            };
        },
    },
});
