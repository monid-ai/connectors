import { defineProvider, presets } from "@shared/core";

/**
 * MuAPI — a unified AI media API. The provider owns the common submit/poll
 * protocol; endpoint files describe each model's input surface and rate card.
 *
 * This connector deliberately starts with current non-Seedance capabilities:
 * Nano Banana 2 image generation, Nano Banana 2 image editing, and Google
 * Veo 3.1 text-to-video. They share MuAPI's prediction lifecycle while
 * keeping their model-specific schemas and billing rules at the endpoint.
 * Published rate cards were checked 2026-09-24 against the vendor's model
 * API pages: https://muapi.ai/playground/nano-banana-2/api,
 * https://muapi.ai/playground/nano-banana-2-edit/api, and
 * https://muapi.ai/veo-3.1.
 */
export default defineProvider({
    name: "muapi",
    meta: {
        displayName: "MuAPI",
        summary:
            "Unified AI image generation, image editing, and video generation.",
        description:
            "Unified AI media generation through one API: generate and edit " +
            "images with Google's Nano Banana 2, or create cinematic videos " +
            "with Google Veo 3.1. Each request is submitted to a " +
            "model-specific endpoint and polled until the finished media URL " +
            "is available. The result envelope reports MuAPI's actual USD " +
            "charge, and failed generations are settled without usage.",
        homepageUrl: "https://muapi.ai",
        docsUrl: "https://muapi.ai/docs/models",
        categories: ["image-generation", "video-generation"],
        notes: [
            "Generation is asynchronous: the initial request creates a " +
            "prediction and the connector polls it internally until MuAPI " +
            "reports completion.",
            "Completed media URLs are delivered by MuAPI and may be temporary; " +
            "download or copy results promptly.",
            "MuAPI pricing is dynamic for these model families. Endpoint " +
            "estimates use the currently published model formulas, while the " +
            "result envelope's actual USD cost is authoritative at settle.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.muapi.ai/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 10_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                logger.warn("muapi submit returned non-2xx", {
                    status: res.status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }

            const requestId = utils.json.optionalGet(
                res.body,
                "$.request_id",
            ) ?? utils.json.optionalGet(res.body, "$.id") ??
                utils.json.optionalGet(res.body, "$.data.id");
            if (typeof requestId !== "string" || requestId === "") {
                throw Object.assign(
                    new Error("MuAPI submit returned no request id"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: requestId } };
        },
        poll: async ({ data, utils, logger }) => {
            const requestId = data.lifecycle.state.externalRunId;
            if (requestId === undefined) {
                throw Object.assign(
                    new Error("muapi poll without externalRunId"),
                    { retriable: false },
                );
            }

            const res = await utils.http({
                method: "GET",
                path: "/predictions/" + encodeURIComponent(requestId) +
                    "/result",
            });
            if (res.status < 200 || res.status >= 300) {
                // A poll transport failure may hide a generation that is
                // still running and billable, so let the engine retry it.
                throw new Error(
                    "MuAPI prediction query returned " + String(res.status),
                );
            }

            const status = utils.json.optionalGet(res.body, "$.status") ??
                utils.json.optionalGet(res.body, "$.data.status");
            if (
                status === "created" || status === "queued" ||
                status === "processing" || status === "running" ||
                status === "pending" || status === "submitted"
            ) {
                return { kind: "RUNNING" };
            }
            if (
                status === "failed" || status === "cancelled" ||
                status === "canceled" || status === "expired"
            ) {
                logger.warn("muapi prediction reached a terminal failure", {
                    requestId,
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "completed" && status !== "succeeded") {
                logger.warn("muapi prediction status is unrecognized", {
                    requestId,
                    status: String(status),
                });
                return { kind: "RUNNING" };
            }

            const outputUrl = utils.json.optionalGet(
                res.body,
                "$.outputs[0]",
            ) ?? utils.json.optionalGet(res.body, "$.data.outputs[0]") ??
                utils.json.optionalGet(res.body, "$.output.outputs[0]") ??
                utils.json.optionalGet(res.body, "$.output.video") ??
                utils.json.optionalGet(res.body, "$.data.video");
            if (typeof outputUrl !== "string" || outputUrl === "") {
                logger.warn("muapi completed without a media URL", {
                    requestId,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const nested = utils.json.optionalGet(
                data.output,
                "$.error.message",
            ) ?? utils.json.optionalGet(data.output, "$.data.error.message");
            const direct = utils.json.optionalGet(data.output, "$.error");
            const flat = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(
                data.output,
                "$.error.code",
            ) ?? utils.json.optionalGet(data.output, "$.data.error.code");
            const message = typeof nested === "string" && nested !== ""
                ? nested
                : typeof direct === "string" && direct !== ""
                ? direct
                : typeof flat === "string" && flat !== ""
                ? flat
                : "MuAPI API error";
            return {
                message,
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        credits: { default: { label: "US dollars" } },
        consolidate: ({ data, utils }) => {
            const top = utils.json.pluck(data.output, "$.cost");
            const picked = top.value === undefined
                ? utils.json.pluck(top.rest, "$.data.cost")
                : top;
            const amount = picked.value === undefined
                ? undefined
                : utils.json.optionalNum(picked.value, "$.amount_usd");
            return {
                credits: {
                    ...(amount !== undefined ? { default: amount } : {}),
                },
                output: picked.rest,
            };
        },
    },
});
