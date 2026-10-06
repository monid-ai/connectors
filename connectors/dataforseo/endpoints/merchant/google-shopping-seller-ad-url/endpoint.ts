import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGoogleShoppingSellerAdUrlPathParams } from "./schema/inputs.ts";

/**
 * Resolve Shopping Ad Link — `GET
 * /v3/merchant/google/sellers/ad_url/{shop_ad_aclk}` (v1
 * `/google-shopping/seller-ad-url`). Flat: $0.000001 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Resolve Shopping Ad Link",
        summary: "Turn a Google Shopping seller ad link (aclk) into the " +
            "merchant's real store URL.",
        description: "Resolves the shop_ad_aclk value returned by " +
            "google-shopping-sellers into the seller's destination URL. " +
            "Returns the resolved URL. Suited for turning ad redirects " +
            "into merchant links.",
        docsUrl:
            "https://docs.dataforseo.com/v3/merchant/google/sellers/ad_url/{shop_ad_aclk}/",
        categories: ["google-shopping"],
    },
    endpoint: "/google-shopping/seller-ad-url",
    request: {
        method: "GET",
        path: "/v3/merchant/google/sellers/ad_url/{shop_ad_aclk}",
    },
    input: { schema: { pathParams: zGoogleShoppingSellerAdUrlPathParams } },
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
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.000001 },
        },
    },
});
