import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokVideoScraperBody } from "./schema/inputs.ts";
import { zTiktokVideoScraperOutput } from "./schema/output.ts";

/**
 * clockworks/tiktok-video-scraper — Get TikTok Video. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get TikTok Video",
        summary: "Extract metadata and engagement metrics from specific " +
            "TikTok video URLs.",
        description: "Extracts structured metadata and engagement metrics " +
            "from specific TikTok video URLs. Returns video " +
            "captions, media URLs, play/view counts, likes, " +
            "comments, shares, creation timestamp, country of " +
            "origin, paid/organic status, hashtags, music metadata " +
            "(track name, author, duration), and basic creator " +
            "profile information (display name, avatar, bio, " +
            "follower counts). Can also retrieve cover images, " +
            "slideshow images, subtitles, and video files.",
        docsUrl: "https://apify.com/clockworks/tiktok-video-scraper",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/clockworks/tiktok-video-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/clockworks~tiktok-video-scraper/runs",
    },
    input: {
        schema: {
            // postURLs (the per-url multiplier) stays the plain
            // actor-required mirror — an empty list is a genuine zero-item
            // promise. The secondary knobs the estimate reads get the
            // actor's OWN verified server defaults at the binding
            // (D24/D25), materialized into the body before any hook runs —
            // including the two add-on gates: shouldDownloadVideos
            // (published default false) and downloadSubtitlesOptions
            // (published default NEVER_DOWNLOAD_SUBTITLES).
            body: zTiktokVideoScraperBody.extend({
                scrapeRelatedVideos: zTiktokVideoScraperBody.shape
                    .scrapeRelatedVideos.unwrap().default(false),
                resultsPerPage: zTiktokVideoScraperBody.shape
                    .resultsPerPage.unwrap().default(1),
                shouldDownloadVideos: zTiktokVideoScraperBody.shape
                    .shouldDownloadVideos.unwrap().default(false),
                downloadSubtitlesOptions: zTiktokVideoScraperBody.shape
                    .downloadSubtitlesOptions.unwrap()
                    .default("NEVER_DOWNLOAD_SUBTITLES"),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zTiktokVideoScraperOutput },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base videos plus the two ADD-ON lines
         *  the caller's inputs switch on (video download; per-MINUTE
         *  AI transcription). Ids normalize from the actor's event
         *  names (D28); Business-tier rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "videos",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                video_download: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "video downloads",
                    description: "add-on per video when " +
                        "shouldDownloadVideos is on",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0006 },
                },
                transcription_minute: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.MINUTE,
                    label: "transcription minutes",
                    description: "speech-to-text transcript, billed per " +
                        "STARTED minute per video when " +
                        "downloadSubtitlesOptions requests AI " +
                        "transcription",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.027 },
                },
            },
        },
        /** one video per post URL, PLUS resultsPerPage related videos per
         *  URL when scrapeRelatedVideos is on (PR #2 finding — every
         *  related record bills as an item). The binding pins the actor's
         *  OWN server defaults (scrapeRelatedVideos false, resultsPerPage
         *  1, shouldDownloadVideos false, downloadSubtitlesOptions
         *  NEVER_DOWNLOAD_SUBTITLES — verified live), materialized into
         *  the body before any hook runs; postURLs is actor-required —
         *  pure arithmetic (D24). Gated lines are PROMISED when their
         *  input switches them on: video_download per video at the same
         *  cap; transcription_minute at the D24 floor 0 (video durations
         *  are unknowable pre-run — the line still appears, so holds
         *  acknowledge the add-on). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const related = body.scrapeRelatedVideos ? body.resultsPerPage : 0;
            const videos = body.postURLs.length * (1 + related);
            const transcribing = body.downloadSubtitlesOptions ===
                    "DOWNLOAD_AND_TRANSCRIBE_VIDEOS_WITHOUT_SUBTITLES" ||
                body.downloadSubtitlesOptions === "TRANSCRIBE_ALL_VIDEOS";
            return {
                counts: {
                    result: videos,
                    ...(body.shouldDownloadVideos
                        ? { video_download: videos }
                        : {}),
                    ...(transcribing ? { transcription_minute: 0 } : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): videos =
         *  delivered items; video_download counts them too when the
         *  download input was on; transcription minutes sum
         *  ceil(seconds/60) from each item's `videoMeta.duration`
         *  (seconds — the actor's published dataset schema) over items
         *  that carry a `videoMeta.transcriptionLink` (the transcript
         *  receipt), when the transcribing mode was on. The D27 claim
         *  (usageTotalUsd) stays the credits truth; these quantities are
         *  the per-line story. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            let minutes = 0;
            for (const item of items) {
                const link = utils.json.optionalGet(
                    item,
                    "$.videoMeta.transcriptionLink",
                );
                if (typeof link !== "string") continue;
                const seconds = utils.json.optionalGet(
                    item,
                    "$.videoMeta.duration",
                );
                if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
                    continue;
                }
                minutes += Math.ceil(seconds / 60);
            }
            const mode = utils.json.optionalGet(
                body,
                "$.downloadSubtitlesOptions",
            );
            const transcribing =
                mode === "DOWNLOAD_AND_TRANSCRIBE_VIDEOS_WITHOUT_SUBTITLES" ||
                mode === "TRANSCRIBE_ALL_VIDEOS";
            return {
                counts: {
                    result: items.length,
                    ...(utils.json.optionalGet(
                            body,
                            "$.shouldDownloadVideos",
                        ) === true
                        ? { video_download: items.length }
                        : {}),
                    ...(transcribing ? { transcription_minute: minutes } : {}),
                },
            };
        },
    },
});
