// Rates: https://api.prerenderbuddy.com/v1/developer/marketplace/rate-card (2026-10-02)
import { defineProvider, presets } from "@shared/core";
import { zJob } from "./schema/outputs.ts";

export default defineProvider({
    name: "prerenderbuddy",
    meta: {
        displayName: "Prerender Buddy",
        summary:
            "AI answers with citations and optional brand visibility evidence.",
        description:
            "Collect one standalone answer from ChatGPT, Claude, Gemini " +
            "or Perplexity through Prerender Buddy's own API. Returned citations, " +
            "sources and optional brand/competitor evidence are included in the " +
            "fixed successful-answer price. These are provider API samples, not " +
            "consumer-app conversations or a historical mentions index. No PB " +
            "subscription is required; the API key uses separate prepaid credit. " +
            "Saved customer workspace data is outside this connector.",
        homepageUrl: "https://prerenderbuddy.com",
        docsUrl: "https://api.prerenderbuddy.com/v1/developer/marketplace/docs",
        categories: ["geo"],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.prerenderbuddy.com/v1/developer/marketplace",
    },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        // The terminal answer carries PB's actual debit. Free readers MUST
        // override this: the same receipt on a later read is not a new debit.
        consolidate: ({ data, utils }) => {
            const charged = utils.json.optionalNum(
                data.output,
                "$.billing.chargedUsd",
            );
            return {
                credits: {
                    ...(charged !== undefined && charged > 0
                        ? { default: charged }
                        : {}),
                },
                output: data.output,
            };
        },
    },
    output: {
        schema: zJob,
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string"
                    ? message
                    : "Prerender Buddy API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
