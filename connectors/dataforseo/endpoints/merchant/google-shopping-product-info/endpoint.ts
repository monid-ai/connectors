import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGoogleShoppingProductInfoBody } from "./schema/inputs.ts";
import { zTaskState } from "../../../schema/common.ts";

/**
 * Google Shopping Product — `POST
 * /v3/merchant/google/product_info/task_post` (v1
 * `/google-shopping/product-info`). Flat: $0.002 per call (design D4).
 * Queued upstream: task_post at high priority, task_get polled (design D6).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Shopping Product",
        summary: "Fetch a Google Shopping product page: specs, rating, and " +
            "price range.",
        description: "Google Shopping product details by product_id. Returns " +
            "title, description, images, rating and review count, price " +
            "range across sellers, specifications, and product variants. " +
            "Suited for product catalogue enrichment. To find the " +
            "location_code or exact location_name for Google Shopping, " +
            "call dataforseo#google-shopping/locations (free lookup, " +
            "country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/merchant/google/product_info/task_post/",
        categories: ["google-shopping"],
        notes: [
            "Queued at high priority (about a minute).",
        ],
    },
    endpoint: "/google-shopping/product-info",
    request: {
        method: "POST",
        path: "/v3/merchant/google/product_info/task_post",
    },
    input: {
        schema: {
            body: z.union([
                zGoogleShoppingProductInfoBody.required({ product_id: true }),
                zGoogleShoppingProductInfoBody.required({ data_docid: true }),
                zGoogleShoppingProductInfoBody.required({ gid: true }),
            ]).describe(
                "Provide at least one of product_id, data_docid, or gid.",
            ),
        },
    },
    timeouts: { runMs: 1_800_000, pollMs: 10_000 },
    lifecycle: {
        state: zTaskState,
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                body: [{ ...data.input.body, priority: 2 }],
            });
            if (res.status < 200 || res.status >= 300) {
                logger.warn(
                    "dataforseo task_post non-2xx — returning as data",
                    {
                        status: res.status,
                    },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const code = utils.json.optionalNum(
                res.body,
                "$.tasks[0].status_code",
            ) ?? utils.json.optionalNum(res.body, "$.status_code");
            const taskId = utils.json.optionalGet(res.body, "$.tasks[0].id");
            if (code === 20100 && typeof taskId === "string" && taskId !== "") {
                const postCost = utils.json.optionalNum(res.body, "$.cost") ??
                    0;
                return {
                    kind: "RUNNING",
                    state: { externalRunId: taskId, data: { postCost } },
                };
            }
            if (code === 20000 || code === 20100) {
                // a 2xx "ok" without a task id is not a created task (v1)
                logger.warn(
                    "dataforseo task_post answered ok without a task id",
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            logger.warn("dataforseo task_post envelope error — synthesizing", {
                code: code ?? null,
            });
            const verdict = code ?? 50000;
            let httpStatus = 502;
            if (verdict === 40100) httpStatus = 401;
            if (verdict === 40200 || verdict === 40210) httpStatus = 402;
            if (
                verdict === 40104 || verdict === 40201 || verdict === 40203 ||
                verdict === 40204
            ) httpStatus = 403;
            if (verdict === 40102 || verdict === 40401) httpStatus = 404;
            if (verdict === 40105) httpStatus = 410;
            if (
                verdict === 40202 || verdict === 40205 || verdict === 40206 ||
                verdict === 40209
            ) httpStatus = 429;
            if (verdict >= 40500 && verdict < 40600) httpStatus = 400;
            return {
                kind: "COMPLETED",
                httpStatus,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
        poll: async ({ data, utils, logger }) => {
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                throw Object.assign(
                    new Error("dataforseo poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            // task_get lives beside task_post on the same product path
            const path = data.request.url.replace(/^https?:\/\/[^/]+/, "")
                .replace(/\/task_post$/, "/task_get/advanced/") +
                encodeURIComponent(runId);
            const res = await utils.http({ method: "GET", path });
            if (res.status >= 500) {
                // an upstream hiccup while the task runs: keep waiting
                return { kind: "RUNNING" };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const code = utils.json.optionalNum(
                res.body,
                "$.tasks[0].status_code",
            ) ?? utils.json.optionalNum(res.body, "$.status_code");
            if (
                code === 40601 || code === 40602 || code === 40202 ||
                code === 40209
            ) {
                // handed / in queue / rate-limited read: still running
                return { kind: "RUNNING" };
            }
            if (code === 20000 || code === 40106) {
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            logger.warn("dataforseo task failed — synthesizing a status", {
                runId,
                code: code ?? null,
            });
            const verdict = code ?? 50000;
            let httpStatus = 502;
            if (verdict === 40100) httpStatus = 401;
            if (verdict === 40200 || verdict === 40210) httpStatus = 402;
            if (
                verdict === 40104 || verdict === 40201 || verdict === 40203 ||
                verdict === 40204
            ) httpStatus = 403;
            if (verdict === 40102 || verdict === 40401) httpStatus = 404;
            if (verdict === 40105) httpStatus = 410;
            if (
                verdict === 40202 || verdict === 40205 || verdict === 40206 ||
                verdict === 40209
            ) httpStatus = 429;
            if (verdict >= 40500 && verdict < 40600) httpStatus = 400;
            return {
                kind: "COMPLETED",
                httpStatus,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
