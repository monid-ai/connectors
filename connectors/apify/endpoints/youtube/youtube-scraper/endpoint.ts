import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeScraperBody } from "./schema/inputs.ts";
import { zYoutubeScraperOutput } from "./schema/output.ts";

/**
 * streamers/youtube-scraper — Pull YouTube Videos. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull YouTube Videos",
        summary: "Scrape YouTube videos, channels, playlists, and search " +
            "results with full metadata and engagement metrics.",
        description:
            "Scrapes YouTube videos, channels, and search results by " +
            "direct URL or search term \u2014 an alternative YouTube API " +
            "with no limits or quotas. Returns video metadata " +
            "(titles, descriptions, durations, release dates), " +
            "engagement metrics (views, likes, comments), channel " +
            "metadata (subscribers, total videos, total views, " +
            "location, social links), playlist and stream listings, " +
            "thumbnails, hashtags, and monetization signals. Can " +
            "download subtitles/transcripts in common formats. " +
            "Supports filtering by video type (regular, shorts, " +
            "streams) and date ranges.",
        docsUrl: "https://apify.com/streamers/youtube-scraper",
        categories: ["youtube"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/streamers/youtube-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/streamers~youtube-scraper/runs",
    },
    input: {
        schema: {
            // maxResults is the primary limiting knob — WE require it at
            // the binding, but keep the published floor min(0): 0 is a
            // MEANINGFUL literal ("crawl no regular videos"), not an
            // unbounded sentinel — the actor's own startUrls description
            // says "If you only want to scrape shorts/streams, set
            // Maximum search results to 0" (published schema, verified
            // 2026-09-08). The secondary caps (maxResultsShorts,
            // maxResultStreams) get the actor's VERIFIED published
            // default (0) at the binding so the estimate can read them.
            // The two source lists (searchQueries, startUrls) stay
            // optional, as on the actor (D25).
            body: zYoutubeScraperBody.required({ maxResults: true })
                .extend({
                    maxResultsShorts: zYoutubeScraperBody.shape
                        .maxResultsShorts.unwrap().default(0),
                    maxResultStreams: zYoutubeScraperBody.shape
                        .maxResultStreams.unwrap().default(0),
                }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zYoutubeScraperOutput },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base videos plus four ADD-ON lines the
         *  caller's inputs switch on. Ids normalize from the actor's
         *  event names (D28); Business-tier rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "videos",
                    consumes: { credit: "default", amount: 0.0024 },
                },
                date_filter: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "date-filtered videos",
                    description: "surcharge per video when channel date " +
                        "filtering (oldestPostDate) is used",
                    consumes: { credit: "default", amount: 0.0006 },
                },
                ai_video_description: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.MINUTE,
                    label: "AI description minutes",
                    description: "timestamped AI description, billed per " +
                        "video minute when aiVideoDescription is on",
                    consumes: { credit: "default", amount: 0.007 },
                },
                ai_video_summary: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.MINUTE,
                    label: "AI summary minutes",
                    description: "AI summary, billed per video minute " +
                        "when aiVideoSummary is on",
                    consumes: { credit: "default", amount: 0.007 },
                },
                transcribe_minute: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.MINUTE,
                    // vendor charge event: "transcribeMinute"
                    label: "transcription minutes",
                    description: "speech-to-text, billed per STARTED " +
                        "minute per video when transcriptionAndSubtitle " +
                        "requests AI transcription",
                    consumes: { credit: "default", amount: 0.027 },
                },
            },
        },
        /** Base videos: (maxResults + maxResultsShorts +
         *  maxResultStreams) × (searchQueries + startUrls) — maxResults
         *  required at the binding, shorts/streams carry the actor's
         *  published default 0; empty source set ⇒ 0 (D25). Gated lines
         *  are PROMISED when their input switches them on: date_filter
         *  at the same video cap; the per-MINUTE lines at the D24 floor
         *  0 (video durations are unknowable pre-run — the line still
         *  appears, so holds acknowledge the add-on). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const cap = body.maxResults + body.maxResultsShorts +
                body.maxResultStreams;
            const n = (body.searchQueries?.length ?? 0) +
                (body.startUrls?.length ?? 0);
            const videos = cap * n;
            const transcribing =
                body.transcriptionAndSubtitle === "TRANSCRIPTION_AS_FALLBACK" ||
                body.transcriptionAndSubtitle === "ALWAYS_TRANSCRIBE";
            return {
                counts: {
                    result: videos,
                    ...(body.oldestPostDate !== undefined
                        ? { date_filter: videos }
                        : {}),
                    ...(body.aiVideoDescription
                        ? { ai_video_description: 0 }
                        : {}),
                    ...(body.aiVideoSummary ? { ai_video_summary: 0 } : {}),
                    ...(transcribing ? { transcribe_minute: 0 } : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): videos =
         *  delivered items; date_filter counts them too when the channel
         *  date input was set; per-MINUTE lines sum ceil(minutes) from
         *  each item's `duration` ("HH:MM:SS" — the actor's published
         *  dataset schema) when their toggle was on. The D27 claim
         *  (usageTotalUsd) stays the credits truth; these quantities are
         *  the per-line story. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            let minutes = 0;
            for (const item of items) {
                const duration = utils.json.optionalGet(item, "$.duration");
                if (typeof duration !== "string") continue;
                const parts = duration.split(":").map(Number);
                const seconds = parts.reduce(
                    (total, part) =>
                        Number.isFinite(part) ? total * 60 + part : total,
                    0,
                );
                minutes += Math.ceil(seconds / 60);
            }
            const mode = utils.json.optionalGet(
                body,
                "$.transcriptionAndSubtitle",
            );
            const transcribing = mode === "TRANSCRIPTION_AS_FALLBACK" ||
                mode === "ALWAYS_TRANSCRIBE";
            return {
                counts: {
                    result: items.length,
                    ...(utils.json.optionalGet(body, "$.oldestPostDate") !==
                            undefined
                        ? { date_filter: items.length }
                        : {}),
                    ...(utils.json.optionalGet(body, "$.aiVideoDescription") ===
                            true
                        ? { ai_video_description: minutes }
                        : {}),
                    ...(utils.json.optionalGet(body, "$.aiVideoSummary") ===
                            true
                        ? { ai_video_summary: minutes }
                        : {}),
                    ...(transcribing ? { transcribe_minute: minutes } : {}),
                },
            };
        },
    },
});
