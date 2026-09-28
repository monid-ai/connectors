import { defineProvider, presets } from "@shared/core";

/**
 * StealthGPT: `https://www.stealthgpt.ai`, `api-token` header auth.
 *
 * Billing: every response reports the words charged (`wordsSpent`, or
 * `creditsSpent` on async runs) against one account balance of Stealth API
 * words. That balance is the pool; every endpoint is a leaf PER_UNIT at
 * amount 1. The provider evidence counts the reported words, the
 * consolidate claims the same number (design D27) and strips the meter and
 * the account fields (`remainingCredits`, `billingMode`,
 * `meteredChargedCredits`) from the output. The published per-model prices
 * are applied in each endpoint's `usage.estimate` only.
 *
 * No provider lifecycle: two endpoints are synchronous.
 */
export default defineProvider({
    name: "stealthgpt",
    meta: {
        displayName: "StealthGPT",
        summary:
            "Humanize AI-written text, generate content, and detect AI-generated text.",
        description: "StealthGPT rephrases text to be undetectable by AI " +
            "detection tools, generates new content from a prompt, runs a " +
            "multi-step Stealth Agent for long-form academic, SEO and " +
            "social content, and scores text for AI detection. Billed per " +
            "word: `super` $0.05 per 100 words, `standard` and `lite` $0.20 " +
            "per 1,000 words, the detector one word per input word, the " +
            "Stealth Agent ceil(output words × 10) words.",
        homepageUrl: "https://www.stealthgpt.ai",
        docsUrl: "https://docs.stealthgpt.ai/api-reference/introduction",
        categories: ["text-generation", "ai-detection"],
        notes: [
            "Rate limits: 3,500 requests per minute and 350,000 words per " +
            "minute.",
            "A vendor error, including 402 when the account cannot be " +
            "billed, completes as data with zero usage.",
        ],
    },
    auth: { inject: presets.auth.header("api-token") },
    request: { baseUrl: "https://www.stealthgpt.ai" },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    usage: {
        credits: {
            default: {
                label: "Stealth API words",
                description:
                    "StealthGPT's word balance; $0.20 per 1,000 words pay-as-you-go",
            },
        },
        evidence: ({ data, utils }) => {
            const words = utils.json.optionalNum(data.output, "$.wordsSpent");
            const credits = utils.json.optionalNum(
                data.output,
                "$.creditsSpent",
            );
            return { counts: { CREDIT: words ?? credits ?? 0 } };
        },
        consolidate: ({ data, utils }) => {
            const words = utils.json.optionalNum(data.output, "$.wordsSpent");
            const credits = utils.json.optionalNum(
                data.output,
                "$.creditsSpent",
            );
            const claimed = words ?? credits;
            return {
                credits: {
                    ...(claimed !== undefined ? { default: claimed } : {}),
                },
                output: utils.json.omit(data.output, [
                    "wordsSpent",
                    "creditsSpent",
                    "remainingCredits",
                    "billingMode",
                    "meteredChargedCredits",
                    "tokensSpent",
                    "totalTokensSpent",
                    "systemTokensSpent",
                ]),
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const runError = utils.json.optionalGet(data.output, "$.error");
            const code = utils.json.optionalGet(runError ?? null, "$.code");
            const nested = utils.json.optionalGet(
                runError ?? null,
                "$.message",
            );
            const top = utils.json.optionalGet(data.output, "$.message");
            let message = "StealthGPT API error";
            if (typeof nested === "string" && nested !== "") {
                message = nested;
            } else if (typeof top === "string" && top !== "") {
                message = top;
            }
            return {
                message,
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
