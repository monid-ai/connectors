import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNoQuery } from "../../../schema/common.ts";

/**
 * Technology Filter Fields — `GET
 * /v3/domain_analytics/technologies/available_filters` (v1
 * `/domain/technology-filters`). Free dictionary lookup (design D7).
 */
export default defineEndpoint({
    meta: {
        displayName: "Technology Filter Fields",
        summary: "List the fields the technology endpoints accept in filters " +
            "and order_by.",
        description:
            "Free lookup. Returns, per endpoint of the API, the fields " +
            "that filters and order_by accept with their types. Read it " +
            "once before building a filter rule. To use these values in " +
            "/domain/domains-by-technology, call " +
            "dataforseo#domain/domains-by-technology (the endpoint this " +
            "list is for). To use these values in " +
            "/domain/domains-by-html-terms, call " +
            "dataforseo#domain/domains-by-html-terms (the endpoint this " +
            "list is for). To use these values in " +
            "/domain/technologies-aggregation, call " +
            "dataforseo#domain/technologies-aggregation (the endpoint " +
            "this list is for).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/available_filters/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/technology-filters",
    request: {
        method: "GET",
        path: "/v3/domain_analytics/technologies/available_filters",
    },
    input: { schema: { queryParams: zNoQuery } },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
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
            if (code === 20000 || code === 40106) {
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            logger.warn("dataforseo envelope error — synthesizing a status", {
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
        model: { kind: UsageModelKind.FREE },
    },
});
