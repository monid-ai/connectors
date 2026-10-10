import { defineProvider, presets } from "@shared/core";

/** Magic Hour — asynchronous AI image, video, and audio generation. */
export default defineProvider({
    name: "magic-hour",
    meta: {
        displayName: "Magic Hour",
        summary:
            "AI image, video, and audio generation, editing, uploads and project management.",
        description:
            "Magic Hour provides APIs for generating and editing " +
            "images, videos, and audio. Submit a generation, poll its project, and receive " +
            "temporary download URLs for the generated media.",
        homepageUrl: "https://magichour.ai",
        docsUrl: "https://docs.magichour.ai",
        categories: ["image-generation", "video-generation"],
        notes: [
            "Generation is asynchronous; Monid polls the corresponding project until it completes.",
            "Download URLs expire. Save completed output promptly.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.magichour.ai" },
    timeouts: { requestMs: 30_000, runMs: 600_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (
                data.request.method !== "POST" ||
                data.request.url.endsWith("/v1/files/upload-urls")
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const projectId = utils.json.optionalGet(res.body, "$.id");
            if (typeof projectId !== "string" || projectId === "") {
                throw Object.assign(
                    new Error("Magic Hour submit returned no project id"),
                    { retriable: false },
                );
            }
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: projectId,
                    data: {
                        collection: data.request.url.endsWith(
                            "/v1/face-detection",
                        )
                            ? "face-detection"
                            : data.request.url.endsWith(
                                    "/v1/ai-voice-generator",
                                ) ||
                                data.request.url.endsWith("/v1/ai-voice-cloner")
                              ? "audio-projects"
                              : [
                                      "ai-talking-photo",
                                      "ai-video-editor",
                                      "ai-video-translator",
                                      "animation",
                                      "audio-to-video",
                                      "auto-subtitle-generator",
                                      "character-replace",
                                      "face-swap",
                                      "image-to-video",
                                      "lip-sync",
                                      "text-to-video",
                                      "video-to-video",
                                  ].some((path) =>
                                      data.request.url.endsWith("/v1/" + path),
                                  )
                                ? "video-projects"
                                : "image-projects",
                    },
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const projectId = data.lifecycle.state.externalRunId;
            if (projectId === undefined) {
                throw Object.assign(
                    new Error("Magic Hour poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: `/v1/${utils.json.optionalGet(data.lifecycle.state.data ?? {}, "$.collection") ?? "image-projects"}/${encodeURIComponent(projectId)}`,
            });
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "Magic Hour project query returned " + String(res.status),
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (
                status === "queued" ||
                status === "rendering" ||
                status === "draft"
            ) {
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: projectId,
                        data: data.lifecycle.state.data,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            if (status === "error" || status === "canceled") {
                logger.warn("Magic Hour project did not complete", {
                    projectId,
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: status === "canceled" ? 409 : 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "complete") {
                logger.warn(
                    "Magic Hour project status unrecognized — treating as in flight",
                    { projectId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const downloads = utils.json.optionalGet(res.body, "$.downloads");
            const hasDownload =
                Array.isArray(downloads) &&
                downloads.some(
                    (item) =>
                        item !== null &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        typeof item.url === "string" &&
                        item.url !== "",
                );
            if (
                !hasDownload &&
                utils.json.optionalGet(
                    data.lifecycle.state.data ?? {},
                    "$.collection",
                ) !== "face-detection"
            ) {
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
    usage: {
        credits: {
            default: {
                label: "Magic Hour credits",
                description: "Credits deducted from the Magic Hour account.",
            },
        },
        consolidate: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            const credits =
                status === "complete"
                    ? utils.json.optionalNum(data.output, "$.credits_charged")
                    : undefined;
            return {
                credits: {
                    ...(credits !== undefined ? { default: credits } : {}),
                },
                output: data.output,
            };
        },
    },
});
