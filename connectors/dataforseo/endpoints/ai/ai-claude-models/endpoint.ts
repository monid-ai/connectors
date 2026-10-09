import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDictionaryQuery } from "../../../schema/common.ts";

/**
 * Claude Models — `GET /v3/ai_optimization/claude/llm_responses/models` (v1
 * `/ai/claude-models`). Free dictionary lookup (design D7).
 */
export default defineEndpoint({
    meta: {
        displayName: "Claude Models",
        summary: "List the Claude model names claude-response accepts.",
        description:
            "Free lookup. Returns rows of model_name with each model's " +
            "web_search support. Search matches the name. To use these " +
            "values in /ai/claude-response, call " +
            "dataforseo#ai/claude-response (the endpoint this list is " +
            "for).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/claude/llm_responses/models/",
        categories: ["geo"],
    },
    endpoint: "/ai/claude-models",
    request: {
        method: "GET",
        path: "/v3/ai_optimization/claude/llm_responses/models",
    },
    input: { schema: { queryParams: zDictionaryQuery } },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            // our search / limit never reach the wire (the list has no
            // query surface); the compiled path carries the country. No
            // limit = the whole list (v1), returned inline
            const res = await utils.request({ queryParams: {} });
            if (res.status < 200 || res.status >= 300) {
                logger.warn("dataforseo non-2xx — returning as data", {
                    status: res.status,
                });
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
            if (code !== 20000 && code !== 40106) {
                logger.warn(
                    "dataforseo envelope error — synthesizing a status",
                    {
                        code: code ?? null,
                    },
                );
                const verdict = code ?? 50000;
                let httpStatus = 502;
                if (verdict === 40100) httpStatus = 401;
                if (verdict === 40200 || verdict === 40210) httpStatus = 402;
                if (
                    verdict === 40104 || verdict === 40201 ||
                    verdict === 40203 ||
                    verdict === 40204
                ) httpStatus = 403;
                if (verdict === 40102 || verdict === 40401) httpStatus = 404;
                if (verdict === 40105) httpStatus = 410;
                if (
                    verdict === 40202 || verdict === 40205 ||
                    verdict === 40206 ||
                    verdict === 40209
                ) httpStatus = 429;
                if (verdict >= 40500 && verdict < 40600) httpStatus = 400;
                return {
                    kind: "COMPLETED",
                    httpStatus,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            const listed = utils.json.optionalGet(
                res.body,
                "$.tasks[0].result",
            );
            const rows = Array.isArray(listed) ? listed : [];
            const query = data.input.queryParams ?? {};
            const search = utils.json.optionalGet(query, "$.search");
            const needle = typeof search === "string"
                ? search.toLowerCase()
                : undefined;
            const matched = needle === undefined
                ? rows
                : rows.filter((row) =>
                    JSON.stringify(row).toLowerCase().includes(needle)
                );
            const limit = utils.json.optionalNum(query, "$.limit");
            const kept = limit === undefined
                ? matched
                : matched.slice(0, limit);
            const task = utils.json.optionalGet(res.body, "$.tasks[0]");
            const envelope =
                typeof res.body === "object" && res.body !== null &&
                    !Array.isArray(res.body)
                    ? res.body
                    : {};
            const head = typeof task === "object" && task !== null &&
                    !Array.isArray(task)
                ? task
                : {};
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: {
                    ...envelope,
                    tasks: [{
                        ...head,
                        result: kept,
                        result_count: kept.length,
                    }],
                },
            };
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
