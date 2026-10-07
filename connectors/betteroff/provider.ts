import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zReadResult } from "./schema/output.ts";

export default defineProvider({
    name: "betteroff",
    meta: {
        displayName: "BetterOff",
        summary: "Read an authorized household's financial context.",
        description:
            "Read setup status, cash flow, and Plaid-reported recurring streams from an existing BetterOff household. Requires that household owner's OAuth authorization and household AI consent. Returns source dates and data-quality limits. Does not connect accounts, approve corrections, or execute payments or trades.",
        homepageUrl: "https://betteroff.finance",
        docsUrl: "https://github.com/raintree-technology/betteroff.connectors",
        categories: ["household-finance"],
        notes: [
            "Local candidate: hosted per-user credential resolution and OAuth refresh have not been verified.",
            "Supply a valid access token obtained through BetterOff OAuth. Access tokens expire after 600 seconds; this connector does not acquire or refresh them.",
            "Never supply tokens or household identifiers as tool input. Never use one household credential for other users.",
            "The FREE usage model describes BetterOff read calls; hosted Monid offer pricing is not verified.",
        ],
    },
    auth: {
        credentials: z.strictObject({ accessToken: z.string().min(1) }),
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                Authorization: "Bearer " + data.params.accessToken,
            },
        }),
    },
    request: {
        baseUrl: "https://api.betteroff.finance",
        headers: {
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-03-26",
        },
    },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const response = await utils.request();
            if (response.status < 200 || response.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: response.status,
                    output: response.body,
                };
            }
            const rpcError = utils.json.optionalGet(response.body, "$.error");
            const result = utils.json.optionalGet(response.body, "$.result");
            const failed = utils.json.optionalGet(result ?? null, "$.isError");
            const structured = utils.json.optionalGet(
                result ?? null,
                "$.structuredContent",
            );
            if (
                rpcError !== undefined || failed === true ||
                utils.json.optionalGet(structured ?? null, "$.ok") === false
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            if (
                utils.json.optionalGet(response.body, "$.jsonrpc") !== "2.0" ||
                utils.json.optionalGet(response.body, "$.id") !== 1 ||
                utils.json.optionalGet(structured ?? null, "$.ok") !== true
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
            };
        },
    },
    output: {
        schema: zReadResult,
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.result.structuredContent"),
    },
});
