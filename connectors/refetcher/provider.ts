import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "refetcher",
    meta: {
        displayName: "Refetcher",
        summary: "Public Instagram, TikTok, Facebook, X, and YouTube data.",
        description:
            "Fetch public social posts, videos, profiles, and YouTube " +
            "channels with normalized engagement metrics, metadata, and " +
            "available media links. Each tool reads one target; social " +
            "profiles accept up to 25 pages and YouTube channels up to 300 uploads. No social-platform login is required.",
        homepageUrl: "https://www.refetcher.com",
        docsUrl: "https://www.refetcher.com/docs",
        categories: ["web-scraping"],
        notes: [
            "The response retains Refetcher's envelope: inspect results[0].success and results[0].error as well as the HTTP status. A failed scrape costs zero.",
            "Each call accepts one target. Social profiles accept 1–25 pages, default 1. YouTube channel reads accept pages 1–25 or recentVideosLimit 1–300; an explicit video count wins when both are supplied, and omitting both keeps the 12-upload default. Batch inputs, unmodeled pagination aliases, and unknown fields are rejected.",
            "YouTube estimates use the requested pages, or the explicit upload count divided by 12 and rounded up; metadata-only channel reads estimate one unit. Settlement uses delivered recentVideos or videos, with a one-unit minimum for successful results.",
            "Profile estimates reserve the requested pages. Settlement uses delivered post counts for Instagram/X and reported fetched pages for TikTok/Facebook. Multi-page TikTok recent-media requests require pagesFetched; metadata-only requests can omit it. Facebook retains the API's legacy post-count fallback. Successful profile metadata costs at least one unit even when no recent posts are returned.",
            "Unavailable metrics stay null or carry metricAvailability; they are not inferred. Source media URLs may expire. YouTube video media contains thumbnailUrl and embedUrl, not a downloadable videoUrl.",
            "Public list price checked 2026-09-22: USD 0.90 per 1,000 successful billable units (https://www.refetcher.com/pricing). Monid's customer pricing and provider account provisioning are separate hosted configuration.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.refetcher.com" },
    input: {
        schema: {
            queryParams: z.strictObject({}),
            pathParams: z.strictObject({}),
        },
    },
    // An execution budget, not an advertised latency SLA. Upstream retries
    // may take longer than a single scrape; no connector-level retry is added.
    timeouts: { requestMs: 180_000, runMs: 180_000 },
    usage: {
        // Refetcher accounts hold USD, not a synthetic vendor credit currency.
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0009 },
            label: "successful scrape",
            description:
                "One successful post/video or billable profile/YouTube upload page; successful profile and channel metadata costs at least one unit.",
        },
        estimate: ({ data, utils }) => {
            const inputBody = data.input.body ?? {};
            const channelUrl = utils.json.optionalGet(
                inputBody,
                "$.channelUrl",
            );
            if (typeof channelUrl === "string") {
                if (
                    utils.json.get(inputBody, "$.type") === "channel" &&
                    utils.json.optionalGet(
                            inputBody,
                            "$.includeRecentVideos",
                        ) === false
                ) return { counts: { RESULT: 1 } };
                const limit =
                    utils.json.optionalNum(inputBody, "$.recentVideosLimit") ??
                        (utils.json.optionalNum(inputBody, "$.pages") ?? 1) *
                            12;
                return {
                    counts: { RESULT: Math.max(1, Math.ceil(limit / 12)) },
                };
            }
            const username = utils.json.optionalGet(
                inputBody,
                "$.username",
            );
            const pages = typeof username === "string"
                ? utils.json.optionalNum(inputBody, "$.pages") ?? 1
                : 1;
            return { counts: { RESULT: pages } };
        },
        evidence: ({ data, utils }) => {
            const results = utils.json.get(data.output, "$.results");
            if (!Array.isArray(results) || results.length !== 1) {
                throw new Error("Expected exactly one Refetcher target result");
            }
            const success = utils.json.get(results[0], "$.success");
            if (typeof success !== "boolean") {
                throw new Error("Expected a boolean Refetcher result.success");
            }
            if (!success) return { counts: { RESULT: 0 } };
            const inputBody = data.input.body ?? {};
            const channelUrl = utils.json.optionalGet(
                inputBody,
                "$.channelUrl",
            );
            if (typeof channelUrl === "string") {
                const type = utils.json.get(inputBody, "$.type");
                const videos = utils.json.optionalGet(
                    results[0],
                    type === "channel" ? "$.recentVideos" : "$.videos",
                );
                if (
                    videos !== undefined && videos !== null &&
                    !Array.isArray(videos)
                ) {
                    throw new Error(
                        "Expected a Refetcher YouTube upload array",
                    );
                }
                const delivered = Array.isArray(videos) ? videos.length : 0;
                const requested =
                    utils.json.optionalNum(inputBody, "$.recentVideosLimit") ??
                        (utils.json.optionalNum(inputBody, "$.pages") ?? 1) *
                            12;
                if (delivered > requested || delivered > 300) {
                    throw new Error(
                        "Refetcher YouTube uploads exceed the requested limit",
                    );
                }
                return {
                    counts: { RESULT: Math.max(1, Math.ceil(delivered / 12)) },
                };
            }
            const username = utils.json.optionalGet(
                inputBody,
                "$.username",
            );
            if (typeof username !== "string") return { counts: { RESULT: 1 } };

            const platform = utils.json.get(inputBody, "$.platform");
            const requested = utils.json.optionalNum(inputBody, "$.pages") ?? 1;
            // These collections can contain the same posts: take the maximum,
            // never their sum. Match the vendor's normalized delivery count.
            let delivered = 0;
            for (
                const path of ["$.recentPosts", "$.recentVideos", "$.postLinks"]
            ) {
                const value = utils.json.optionalGet(results[0], path);
                if (value !== undefined && value !== null) {
                    if (!Array.isArray(value)) {
                        throw new Error(
                            "Expected a Refetcher profile post array",
                        );
                    }
                    delivered = Math.max(delivered, value.length);
                }
            }
            let pages = Math.max(
                1,
                Math.ceil(delivered / (platform === "x" ? 5 : 12)),
            );
            if (platform === "facebook" || platform === "tiktok") {
                const fetched = utils.json.optionalGet(
                    results[0],
                    "$.pageInfo.recentPosts.pagesFetched",
                );
                if (fetched !== undefined && fetched !== null) {
                    if (
                        typeof fetched !== "number" ||
                        !Number.isInteger(fetched) || fetched < 0
                    ) {
                        throw new Error(
                            "Expected a non-negative integer Refetcher pagesFetched",
                        );
                    }
                    if (platform === "tiktok" && fetched === 0) {
                        if (delivered > 0) {
                            throw new Error(
                                "Refetcher TikTok page evidence contradicts delivered posts",
                            );
                        }
                        pages = 1;
                    }
                    // Facebook's zero/absent counts retain its legacy fallback.
                    if (fetched > 0) pages = fetched;
                } else if (
                    platform === "tiktok" && requested > 1 &&
                    (utils.json.optionalGet(
                                inputBody,
                                "$.includeRecentPosts",
                            ) === true || delivered > 0)
                ) {
                    throw new Error(
                        "Multi-page Refetcher TikTok requires pagesFetched",
                    );
                }
            }
            if (pages > requested || pages > 25) {
                throw new Error(
                    "Refetcher billed pages exceed the requested page bound",
                );
            }
            return { counts: { RESULT: pages } };
        },
        // No consolidate: public scrape responses do not carry a USD receipt.
    },
});
