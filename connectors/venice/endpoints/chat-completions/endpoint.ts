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
 * The estimate is a CONSERVATIVE BOUND priced at the top published rates:
 * everything the caller sends (text, tool definitions, schemas, images)
 * plus measured allowances for what Venice injects server-side (overhead,
 * system prompt, search and scrape context) — see `estimate` below.
 * `max_completion_tokens` is REQUIRED at the binding (the primary limiting
 * knob — D25); the settle trues down to the real cost.
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
            "The hold prices every token at the top published rates and " +
            "adds allowances for context Venice injects: web scraping alone " +
            "reserves ~$0.35, so enable it only when the prompt has URLs.",
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
        /** Conservative hold, in nano-dollars, every token priced at the
         *  top published rates ($12/1M input = 12,000 per token, $60/1M
         *  output = 60,000 per token):
         *   - caller-sent input: UTF-8 bytes of text parts, assistant
         *     `tool_calls`, `tools` and `response_format` (byte-level BPE
         *     spends ≥1 byte per token);
         *   - 2,000 tokens of Venice-side overhead (measured 2026-10-08:
         *     ~560 fixed + ~1,200 for the default system prompt);
         *   - 8,000 tokens per image part (vision models bill images as
         *     prompt tokens; inline base64 bytes are NOT counted as text);
         *   - web search: 8,000 injected tokens (measured 3,700-4,400)
         *     + the $0.01 search fee;
         *   - web scraping: 25,000 injected tokens (Venice's default
         *     scraped-content cap) + $0.01 per URL for the 5 URLs Venice
         *     scrapes at most;
         *   - X search: 8,000 injected tokens + $0.01 per search, 5 assumed;
         *   - `max_completion_tokens` at the output rate.
         *  Injected context is sized server-side by Venice, so the
         *  allowances are measured bounds, not a proof; the settle always
         *  trues down to the reported cost. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const texts = [""];
            let images = 0;
            for (const message of body.messages) {
                const content = "content" in message ? message.content : "";
                if (typeof content === "string") texts.push(content);
                else if (Array.isArray(content)) {
                    for (const part of content) {
                        if (part.type === "text") texts.push(part.text);
                        else images += 1;
                    }
                }
                if ("tool_calls" in message && message.tool_calls) {
                    texts.push(JSON.stringify(message.tool_calls));
                }
            }
            if (body.tools) texts.push(JSON.stringify(body.tools));
            if (body.response_format) {
                texts.push(JSON.stringify(body.response_format));
            }
            let bytes = 0;
            for (const text of texts) {
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
            const vp = body.venice_parameters;
            const search = vp?.enable_web_search === "on" ||
                vp?.enable_web_search === "auto";
            const scrape = vp?.enable_web_scraping === true;
            const xSearch = vp?.enable_x_search === true;
            const inputTokens = bytes + 2_000 + images * 8_000 +
                (search ? 8_000 : 0) + (scrape ? 25_000 : 0) +
                (xSearch ? 8_000 : 0);
            const fees = (search ? 10_000_000 : 0) +
                (scrape ? 50_000_000 : 0) + (xSearch ? 50_000_000 : 0);
            return {
                counts: {
                    "CREDIT": inputTokens * 12_000 +
                        body.max_completion_tokens * 60_000 + fees,
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
