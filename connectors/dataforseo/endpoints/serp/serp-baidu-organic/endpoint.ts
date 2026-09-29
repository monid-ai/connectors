import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpBaiduOrganicBody } from "./schema/inputs.ts";
import { zTaskState } from "../../../schema/common.ts";

/**
 * Baidu Search Results — `POST /v3/serp/baidu/organic/task_post` (v1
 * `/serp/baidu-organic`). Page-billed: $0.0012 per page of 10 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5). Queued upstream: task_post at high priority,
 * task_get polled (design D6).
 */
export default defineEndpoint({
    meta: {
        displayName: "Baidu Search Results",
        summary: "Fetch Baidu organic search results with SERP features " +
            "parsed.",
        description: "Baidu SERP for a keyword and Chinese location. Returns " +
            "organic results with rank, title, URL, description, and " +
            "breadcrumb, plus related searches, images, videos, and " +
            "Baidu-specific blocks. Supports depth up to 700 and " +
            "get_website_url to resolve Baidu redirect links. Suited for " +
            "China-market rank tracking. To find the location_code or " +
            "exact location_name for a city or country, call " +
            "dataforseo#serp/baidu-locations (free lookup of Baidu " +
            "locations; country filter + search).",
        docsUrl: "https://docs.dataforseo.com/v3/serp/baidu/organic/task_post/",
        categories: ["web-search"],
        notes: [
            "Queued at high priority (about a minute). Billed per page of " +
            "10 results; each further page adds the same price.",
        ],
    },
    endpoint: "/serp/baidu-organic",
    request: { method: "POST", path: "/v3/serp/baidu/organic/task_post" },
    input: {
        schema: {
            body: zSerpBaiduOrganicBody.extend({
                depth: zSerpBaiduOrganicBody.shape.depth.unwrap().default(10),
            }),
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
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 10,
            consumes: { credit: "default", amount: 0.0012 },
            label: "results requested",
            description:
                "results asked for (depth, or max_crawl_pages pages), " +
                "billed per page of 10",
        },
        estimate: ({ data }) => ({
            counts: {
                RESULT: Math.max(
                    data.input.body.depth,
                    (data.input.body.max_crawl_pages ?? 1) * 10,
                ),
            },
        }),
    },
});
