import { defineProvider, presets } from "@shared/core";

/** Magic Hour — asynchronous AI image, video, and audio generation. */
export default defineProvider({
    name: "magic-hour",
    meta: {
        displayName: "Magic Hour",
        summary:
            "AI media generation for images, video, and audio, starting with prompt-to-GIF animation.",
        description: "Magic Hour provides APIs for generating and editing " +
            "images, videos, and audio. This connector starts with AI GIF " +
            "generation: submit a prompt, poll the image project, and receive " +
            "a temporary download URL for GIF, MP4, or WebM output.",
        homepageUrl: "https://magichour.ai",
        docsUrl: "https://docs.magichour.ai",
        categories: ["image-generation", "video-generation"],
        notes: [
            "Generation is asynchronous; Monid polls the image project until it completes.",
            "Download URLs expire. Save completed output promptly.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.magichour.ai" },
    timeouts: { requestMs: 30_000, runMs: 600_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
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
                state: { externalRunId: projectId },
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
                path: `/v1/image-projects/${projectId}`,
            });
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "Magic Hour image project query returned " +
                        String(res.status),
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (
                status === "queued" || status === "rendering" ||
                status === "draft"
            ) {
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: projectId,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            if (status === "error" || status === "canceled") {
                logger.warn("Magic Hour image project did not complete", {
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
                    "Magic Hour image project status unrecognized — treating as in flight",
                    { projectId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const downloads = utils.json.optionalGet(res.body, "$.downloads");
            const hasDownload = Array.isArray(downloads) && downloads.some(
                (item) =>
                    item !== null && typeof item === "object" &&
                    !Array.isArray(item) && typeof item.url === "string" &&
                    item.url !== "",
            );
            if (!hasDownload) {
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
            const credits = status === "complete"
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
