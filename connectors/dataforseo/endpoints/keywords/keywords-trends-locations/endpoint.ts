import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCountryPath, zDictionaryQuery } from "../../../schema/common.ts";

/**
 * Keyword Trend Locations — `GET
 * /v3/keywords_data/dataforseo_trends/locations/{country}` (v1
 * `/keywords/trends-locations`). Free dictionary lookup (design D7).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Trend Locations",
        summary: "Look up trend-explore location codes and names by country " +
            "and text.",
        description:
            "Free lookup. Returns rows of location_code, location_name, " +
            "location_code_parent, country_iso_code, and location_type " +
            "(Country, State, City, ...). Pass country (ISO code) to " +
            "scope the list and search to match a name \u2014 a full country " +
            "runs to tens of thousands of rows. To use these values in " +
            "/keywords/trends-explore, call " +
            "dataforseo#keywords/trends-explore (the endpoint this list " +
            "is for). To use these values in /keywords/trends-subregions, " +
            "call dataforseo#keywords/trends-subregions (the endpoint " +
            "this list is for). To use these values in " +
            "/keywords/trends-merged, call " +
            "dataforseo#keywords/trends-merged (the endpoint this list is " +
            "for).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/locations/{country}/",
        categories: ["seo"],
    },
    endpoint: "/keywords/trends-locations",
    request: {
        method: "GET",
        path: "/v3/keywords_data/dataforseo_trends/locations/{country}",
    },
    input: {
        schema: { pathParams: zCountryPath, queryParams: zDictionaryQuery },
    },
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
