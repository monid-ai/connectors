import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zHumanizeRunBody } from "./schema/inputs.ts";

/**
 * `POST /api/stealthify/runs`: async Writer & Humanizer.
 *
 * The submit answers `202 {runId, status, statusUrl}`; the lifecycle polls
 * `statusUrl` (fallback: submit URL + `/{runId}`) until `completed`,
 * `failed` or `cancelled`, so one run returns the finished rewrite. The
 * submit carries `idempotency-key: {runId}:submit`. The lifecycle fns are
 * byte-identical to `agent-runs`' and intern to one fnTable entry per
 * phase.
 *
 * `model` is required at the binding (the docs require it; it is the price
 * selector). Same PER_UNIT and D24-floor estimate as the sync writer.
 */
export default defineEndpoint({
    meta: {
        displayName: "StealthGPT Humanizer Run",
        summary:
            "Humanize text as an asynchronous run; returns the finished rewrite.",
        description: "Humanizes existing text through StealthGPT's async " +
            "run API: the run is created and polled to completion, and the " +
            "finished `result` and `howLikelyToBeDetected` (0–100, higher " +
            "is better) are returned. `text` is the source text only. " +
            "`model` is required: `super` ($0.05 per 100 words), " +
            "`standard` or `lite` ($0.20 per 1,000 words). Billed on input " +
            "plus output words, the same as `stealthgpt#api/stealthify`. " +
            "Use for long texts or long-running humanization; use " +
            "`stealthgpt#api/stealthify` to generate content.",
        docsUrl:
            "https://docs.stealthgpt.ai/api-reference/endpoints/stealthify-runs",
        categories: ["text-generation"],
        notes: [
            "Send only the source text in `text`, without instructions.",
            "Humanizes existing text only; it does not generate content.",
            "The estimate counts input words only; the charge adds the " +
            "output words.",
            "A run that ends `failed` or `cancelled` completes as an error " +
            "with zero usage.",
        ],
    },
    request: { method: "POST", path: "/api/stealthify/runs" },
    input: {
        schema: {
            body: zHumanizeRunBody.required({ model: true }).extend({
                qualityMode: zHumanizeRunBody.shape.qualityMode.unwrap()
                    .default("quality"),
                outputFormat: zHumanizeRunBody.shape.outputFormat.unwrap()
                    .default("text"),
            }),
        },
    },
    timeouts: { requestMs: 60_000, runMs: 900_000, pollMs: 10_000 },
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
            description: "Stealth API words charged (input plus output words)",
        },
        estimate: ({ data }) => {
            const text = data.input.body.text.trim();
            const words = text === "" ? 0 : text.split(/\s+/).length;
            const multiplier = data.input.body.model === "super" ? 2.5 : 1;
            return { counts: { CREDIT: Math.ceil(words * multiplier) } };
        },
    },
});
