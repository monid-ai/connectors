import { defineProvider, presets } from "@shared/core";
import { z } from "zod";

/**
 * cloro (cloro.dev) — structured scrapes of AI assistants and Google
 * search surfaces. Seven JSON endpoints on ONE wire surface:
 * `POST https://api.cloro.dev/v1/monitor/<engine>`, Bearer auth. Each
 * answers `{ success: true, result: {...} }`.
 *
 * RUN MODE BY MEASURED LATENCY. Google Search, Google News and AI Mode
 * answer in seconds and run sync: the lifecycle start below makes the call.
 * ChatGPT, Gemini, Copilot and Perplexity take 30 s to minutes and run
 * async on monid's side: their endpoint start acknowledges the run, and
 * the first poll makes the same single call with this relay.
 *
 * BILLING. cloro bills one pool of credits per organization. A sync
 * request costs the engine's base credits, plus a flat 2-credit sync
 * surcharge, plus the add-ons the request turns on (state targeting,
 * ChatGPT raw data, Google AI Overview, extra Google pages, AI Mode
 * expanded products). Each endpoint states that card as a COMPOSITE: one
 * `call` line (base + sync surcharge) and one PER_UNIT line per add-on.
 * Rate card: https://cloro.dev/docs/guides/providers (checked 2026-09-21).
 *
 * The actual charge is the vendor claim (design D27): every 200 carries
 * `X-Credits-Charged`, the credits cloro took for the request, AI Mode
 * product adjustments and per-organization overrides included. A
 * lifecycle relay (the ahrefs pattern) carries it into state for
 * usage.consolidate. A missing or malformed header falls back to the
 * rate card. Non-2xx responses are not charged by cloro, and the engine
 * settles them at zero.
 */
export default defineProvider({
    name: "cloro",
    meta: {
        displayName: "cloro",
        summary:
            "Structured answers from ChatGPT, Gemini, Perplexity, Copilot, Google AI Mode and Google Search.",
        description: "cloro runs a prompt or a query on a real AI assistant " +
            "or Google surface, in a chosen country, and returns the answer " +
            "as structured JSON: the answer text, the cited sources, " +
            "shopping cards, brand entities and ads, or the full Google " +
            "SERP with organic results, People Also Ask and the AI " +
            "Overview. Use it to measure how a brand or a page shows up in " +
            "AI answers (GEO) and in search results (SEO). It returns what " +
            "a real user in that country sees, not a model API completion.",
        homepageUrl: "https://cloro.dev",
        docsUrl: "https://cloro.dev/docs",
        categories: ["ai-search", "geo", "seo"],
        notes: [
            "Billed in cloro credits: the endpoint's base credits plus a " +
            "2-credit sync surcharge, plus the add-ons the request turns " +
            "on. The X-Credits-Charged response header settles the bill; " +
            "without it, settlement falls back to the published rate card.",
            "Google Search, Google News and AI Mode answer in seconds and " +
            "run synchronously. ChatGPT, Gemini, Copilot and Perplexity " +
            "take 30 seconds to a few minutes and run asynchronously: the " +
            "run is acknowledged at once and completes on the first poll.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.cloro.dev/v1",
        headers: { Accept: "application/json" },
    },
    // cloro stops a sync scrape after 5 minutes (docs changelog); the
    // run budget leaves room for the response to arrive.
    timeouts: { requestMs: 300_000, runMs: 310_000 },
    lifecycle: {
        state: z.strictObject({
            creditsCharged: z.number().nonnegative().optional(),
        }),
        start: async ({ utils }) => {
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
        credits: {
            default: {
                label: "cloro credits",
                description: "the organization's credit balance; each " +
                    "successful request draws base + sync surcharge + add-ons",
            },
        },
        consolidate: ({ data, utils }) => {
            const creditsCharged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.creditsCharged",
            );
            return {
                credits: {
                    ...(typeof creditsCharged === "number"
                        ? { default: creditsCharged }
                        : {}),
                },
            };
        },
    },
    output: {
        /** cloro errors are non-2xx `{ error: { code, message, details?,
         *  timestamp } }` bodies. The raw body rides under `raw`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "cloro API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
