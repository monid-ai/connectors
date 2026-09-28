import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zAgentRunBody } from "./schema/inputs.ts";

/**
 * `POST /api/stealthify/agent/runs`: Stealth Agent, async run.
 *
 * Same 202-then-poll protocol as `humanize-runs`; the lifecycle fns are
 * byte-identical and intern to one fnTable entry per phase. Only the async
 * route is exposed: the synchronous `/api/stealthify/agent` holds a
 * connection for up to 600 s and the docs recommend the async route for
 * integrations.
 *
 * Billed `creditsSpent = ceil(outputWords × 10)`; nothing in the input
 * bounds the output, so the estimate is the D24 floor, 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "StealthGPT Stealth Agent",
        summary:
            "Generate long-form academic, SEO or social content with the Stealth Agent.",
        description: "Runs the Stealth Agent pipeline (research, draft, " +
            "optional fact-check, humanize, optional images) and returns " +
            "the result as markdown. `preset` selects `academic` (essays " +
            "and research-style writing with citations), `seo` (long-form " +
            "blog and guide content) or `social` (LinkedIn or Medium " +
            "posts; `platform` required). The run is created and polled to " +
            "completion. Billed ceil(output words × 10) Stealth API words, " +
            "about $0.002 per output word at $0.20 per 1,000; the pre-run " +
            "estimate is 0 because the charge depends on output length. " +
            "Include a target length in the prompt to control cost. To " +
            "rewrite existing text use `stealthgpt#api/stealthify`.",
        docsUrl:
            "https://docs.stealthgpt.ai/api-reference/endpoints/stealthify-agent-runs",
        categories: ["text-generation", "agents"],
        notes: [
            "Runs take several minutes.",
            '`platform` is required with `preset: "social"` only.',
            "`enableFactCheck` and `enableImageGeneration` add latency, " +
            "not price.",
            "A run that ends `failed` or `cancelled` completes as an error " +
            "with zero usage.",
        ],
    },
    request: { method: "POST", path: "/api/stealthify/agent/runs" },
    input: { schema: { body: zAgentRunBody } },
    timeouts: { requestMs: 60_000, runMs: 1_500_000, pollMs: 10_000 },
    lifecycle: {
        state: z.strictObject({
            statusPath: z.string().optional().describe(
                "The relative status route StealthGPT named in `statusUrl`.",
            ),
        }),
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "idempotency-key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const runId = utils.json.optionalGet(res.body, "$.runId");
            if (typeof runId !== "string" || runId === "") {
                throw new Error("StealthGPT did not return a runId");
            }
            const link = utils.json.optionalGet(res.body, "$.statusUrl");
            if (typeof link === "string" && link.charAt(0) === "/") {
                return {
                    kind: "RUNNING",
                    state: { externalRunId: runId, data: { statusPath: link } },
                };
            }
            return { kind: "RUNNING", state: { externalRunId: runId } };
        },
        poll: async ({ data, utils, logger }) => {
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                throw Object.assign(
                    new Error("stealthgpt poll without externalRunId"),
                    { retriable: false },
                );
            }
            const statusPath = data.lifecycle.state.data?.statusPath;
            const res = await utils.http(
                statusPath === undefined
                    ? {
                        method: "GET",
                        url: data.request.url + "/" +
                            encodeURIComponent(runId),
                    }
                    : { method: "GET", path: statusPath },
            );
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("stealthgpt run status lookup transient", {
                    runId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "queued" || status === "running") {
                return { kind: "RUNNING" };
            }
            if (status === "completed") {
                logger.info("stealthgpt run completed", { runId });
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            if (status !== "failed" && status !== "cancelled") {
                throw new Error(
                    "StealthGPT returned an unknown run status: " +
                        String(status),
                );
            }
            logger.warn("stealthgpt run did not complete", { runId, status });
            return {
                kind: "COMPLETED",
                httpStatus: status === "cancelled" ? 499 : 500,
                providerHttpStatus: 200,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "words",
            description: "Stealth API words charged (ceil(output words × 10))",
        },
        estimate: () => ({ counts: { CREDIT: 0 } }),
    },
});
