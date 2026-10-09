import { defineProvider, presets } from "@shared/core";

/**
 * transcribe.so — speech-to-text for public media URLs (YouTube, podcast
 * platforms, direct audio/video links) with speaker labels, timestamps,
 * chapters and subtitles. JSON-over-HTTP against
 * `https://transcribe.so/api/v1` with bearer-token auth (`presets.auth.bearer`).
 *
 * SHARED KEY. The connector runs every monid user's job under ONE
 * transcribe.so account (the vendor key monid holds), so every
 * transcription it creates belongs to that one account. NEVER add an
 * endpoint that takes a transcription id: every monid user would read
 * every other user's transcript. The id lives only in lifecycle state
 * (`externalRunId`), is never returned in the output, and the poll
 * strips it — and the dashboard deep-links that carry it — out of the
 * chapters before they ride the payload.
 *
 * ONE endpoint (`transcribe-so#transcriptions`), one lifecycle, authored
 * HERE (kling's posture — the whole run protocol is a provider fact):
 *   - start: `POST /transcriptions` with the FLAT wire body assembled from
 *     the validated input (`source` derived from the URL's host), under a
 *     run-stable `Idempotency-Key` so a host-side retry of the start tick
 *     cannot create a second paid job. A 409 (the same key's first request
 *     is still in flight upstream), a 429 or a 5xx on the create is THROWN
 *     (retriable — the key makes the retry converge on the ONE job); any
 *     other non-2xx is DATA (COMPLETED with the vendor's status and
 *     envelope, zero-billed): a 402 `insufficient_funds` /
 *     `spend_cap_exceeded` / `max_charge_exceeded` reaches the caller
 *     verbatim.
 *   - poll: `GET /transcriptions/{id}/wait?timeout=25&include=chapters`
 *     — the vendor's own long-poll (25 s < requestMs 35 s). `_timed_out`
 *     or an in-flight status parks the run; `completed` fans out the
 *     artifact reads (`Promise.all`: transcript markdown always, SRT/VTT
 *     only when `formats` asks) and assembles the output; `failed` /
 *     `cancelled` / `quoted` settle as OUR synthesized 502 with a FIXED
 *     `{error: {code, message}}` — the vendor's internal error text is
 *     never copied (it can name the id or infrastructure).
 *   - no stop: transcribe.so exposes no cancel for a started job.
 *
 * BILLING: the pool is US dollars (pay-as-you-go retail, $1 per audio
 * hour = $0.016667 per billed minute, whole minutes).
 * Pricing: https://transcribe.so/pricing (read 2026-09-26): pay as you go,
 * $1 per audio hour = $0.016667 per billed minute.
 * The endpoint's `estimate` holds the caller's own `max_charge_usd`
 * ceiling expressed in minutes; `evidence` settles
 * `ceil(duration_seconds / 60)` off the completed row, and the engine's
 * fold (minutes × the pinned rate) IS the bill. There is deliberately NO
 * `usage.consolidate`: the completed row does carry `charge_usd`, but the
 * vendor rounds it — the recorded happy fixture shows 0.03 for 2 billed
 * minutes against the fold's 0.033334 — and claiming it would raise
 * `usage.mismatch.derived` (monid's rate-drift alarm) for that fixture,
 * and in general whenever the vendor rounds. `charge_usd` is not returned
 * in the output either; the receipt is the fold.
 */
export default defineProvider({
    name: "transcribe-so",
    meta: {
        displayName: "transcribe.so",
        summary:
            "Transcribe any public media URL into a speaker-labelled, timestamped transcript with chapters and subtitles.",
        description: "Speech-to-text for public media URLs — YouTube, " +
            "Apple Podcasts, Spotify episodes, SoundCloud, Vimeo, Twitch " +
            "VODs, Loom, and direct mp3/mp4 links (Drive/Dropbox share " +
            "links included). One run turns a URL into a markdown " +
            "transcript with speaker labels and timestamps, LLM-curated " +
            "chapters, and optional SRT/VTT subtitles. Strengths: 100+ " +
            "languages with auto-detection, whole-hour recordings in " +
            "minutes, a hard per-job charge ceiling you set. Limits: " +
            "asynchronous (poll the run), no cancel once started, the " +
            "source must be publicly reachable without login.",
        homepageUrl: "https://transcribe.so",
        docsUrl: "https://transcribe.so/developers/docs",
        categories: ["speech"],
        /** Caveats true of the connector as a whole (one standalone fact
         *  per entry — the additive `notes` leaf). */
        notes: [
            "Transcription is asynchronous: a 90-second clip finishes in " +
            "about a minute, an hour of audio in several minutes. The run " +
            "polls transcribe.so's long-poll endpoint until the job is " +
            "terminal — poll the run rather than blocking on it.",
            "max_charge_usd is REQUIRED and is a hard ceiling checked " +
            "BEFORE anything is charged: a job whose retail price would " +
            "exceed it is refused with 402 max_charge_exceeded and nothing " +
            "is held. The pre-run hold equals max_charge_usd (in whole " +
            "minutes at $0.016667); the settle bills the real duration in " +
            "whole minutes at that rate.",
            "Pay-as-you-go retail is US$1 per audio hour ($0.016667 per " +
            "billed minute, whole minutes, minimum 1). For external_url " +
            "sources the server probes the real duration and trues the " +
            "charge up to it; that true-up, and a queued re-drive of a " +
            "job the server had to restart, are not bound by " +
            "max_charge_usd.",
            "402 insufficient_funds or spend_cap_exceeded means the " +
            "connector's own transcribe.so wallet is empty or capped — not " +
            "the caller's balance.",
            "A job that fails after it started releases its hold on the " +
            "vendor side and nothing is charged; it settles here as a 502 " +
            "with zero usage.",
            "There is no cancel: a run abandoned when runMs (6 hours) " +
            "expires leaves the job running upstream, and it stays charged.",
            "Output size: the markdown transcript is always returned and " +
            "already carries chapters; srt and vtt are fetched only when " +
            "formats asks for them. A long recording's markdown runs to " +
            "hundreds of KB.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://transcribe.so/api/v1" },
    // 35 s per HTTP call (the /wait long-poll holds 25 s), 6 h per run (a
    // multi-hour recording plus queueing), 2 s between ticks — the server
    // does the waiting, so the cadence only bridges consecutive long-polls.
    timeouts: { requestMs: 35_000, runMs: 6 * 60 * 60_000, pollMs: 2_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const $ = utils.json;
            // `?? null`: the provider ctx types the body as Json | undefined
            // (it serves any endpoint) while JsonUtil takes Json; the schema
            // guarantees an object here, so null is never actually read.
            const input = data.input.body ?? null;
            const url = $.str(input, "$.url");
            // source type by HOST (no `URL` in a closed term — string ops):
            // scheme off, first path segment, userinfo off, port off, www off
            const host = url.toLowerCase()
                .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
                .split("/")[0].split("?")[0].split("#")[0]
                .split("@").reverse()[0]
                .split(":")[0].replace(/^www\./, "");
            const isYoutube = ["youtube.com", "youtu.be"].some((d) =>
                host === d || host.endsWith("." + d)
            );
            const isPlatform = [
                "podcasts.apple.com",
                "open.spotify.com",
                "soundcloud.com",
                "vimeo.com",
                "twitch.tv",
                "loom.com",
            ].some((d) => host === d || host.endsWith("." + d));
            const source = isYoutube
                ? "youtube"
                : isPlatform
                ? "platform_url"
                : "external_url";
            const duration = $.optionalGet(input, "$.duration_seconds");
            const language = $.optionalStr(input, "$.language") ?? "auto";
            const maxChargeUsd = $.num(input, "$.max_charge_usd");
            // The DEFAULT RELAY with an explicit body: the connector input
            // is NOT the wire body (`formats` is ours, `source` is derived),
            // and `input.toRequest` cannot be used here because the
            // lifecycle only ever sees the POST-toRequest input — poll
            // needs `formats`, so the input stays whole and the wire body
            // is assembled at the one place that sends it. The
            // Idempotency-Key is the host-stable run id (24 h, body-hash
            // bound upstream), so a retried start converges on ONE job.
            // Compiled headers are spread first — `utils.request` merges
            // them anyway, `utils.http` would not; spelled out so the two
            // read the same.
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": String(data.run.runId).slice(0, 128),
                },
                body: {
                    source,
                    url,
                    ...(typeof duration === "number"
                        ? { duration_seconds: duration }
                        : {}),
                    language,
                    max_charge_usd: maxChargeUsd,
                },
            });
            if (
                res.status === 409 || res.status === 429 || res.status >= 500
            ) {
                // 409: the SAME Idempotency-Key's first request is still in
                // flight upstream (our API answers 409 not_ready with
                // Retry-After 1) — a job may exist and be charging, so this
                // must never settle as data with nothing polling it; the
                // retry replays the key and receives that job's 202.
                // 429 / 5xx (503 ProbeUnavailable included): no job exists
                // yet and the key makes the retry safe. All THROW
                // (retriable). The body is deliberately not in the message.
                throw new Error(
                    "transcribe.so create answered HTTP " + String(res.status),
                );
            }
            if (res.status < 200 || res.status >= 300) {
                // 400 invalid_request, 401, 402 insufficient_funds /
                // spend_cap_exceeded / max_charge_exceeded — nothing was
                // held: DATA, zero-billed, envelope verbatim so the caller
                // sees the vendor's own code.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const id = $.optionalGet(res.body, "$.id");
            const externalRunId = typeof id === "number" && Number.isFinite(id)
                ? String(id)
                : typeof id === "string" && id !== ""
                ? id
                : undefined;
            if (externalRunId === undefined) {
                // a 2xx without a readable id: the vendor accepted a job we
                // cannot follow — ours/theirs (design D12)
                logger.warn(
                    "transcribe.so accepted the job without a readable id — synthesizing 502",
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error: {
                            code: "malformed_create_response",
                            message:
                                "transcribe.so accepted the job but returned no readable transcription id.",
                        },
                    },
                };
            }
            const status = $.optionalGet(res.body, "$.status");
            if (status === "quoted") {
                // priced but never started: the hold failed upstream and
                // waiting achieves nothing
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error: {
                            code: "hold_failed",
                            message:
                                "transcribe.so priced the job but never started it; nothing was charged.",
                        },
                    },
                };
            }
            logger.debug("transcribe.so job accepted", {
                status: typeof status === "string" ? status : null,
            });
            return {
                kind: "RUNNING",
                state: {
                    externalRunId,
                    ...(typeof status === "string" ? { stage: status } : {}),
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const $ = utils.json;
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                // corrupted thread state — deterministic, never retriable
                throw Object.assign(
                    new Error(
                        "transcribe-so poll without externalRunId in state",
                    ),
                    { retriable: false },
                );
            }
            // every read hangs off the compiled request url + the id
            const base = data.request.url + "/" + encodeURIComponent(id);
            const res = await utils.http({
                method: "GET",
                url: base + "/wait",
                queryParams: { timeout: "25", include: "chapters" },
            });
            if (res.status === 429) {
                // the STATUS READ was rate-limited (60/min/key), not the
                // job: honor Retry-After (seconds), clamped so a bad value
                // cannot stall the run; bounded by runMs.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(
                        Math.max(Math.ceil(after * 1000), 1_000),
                        120_000,
                    )
                    : 15_000;
                logger.warn("transcribe.so rate-limited the status read", {
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status >= 500) {
                // OUR read failed while the job keeps running (and stays
                // charged) — never conclude from a flaky poll: THROW
                throw new Error(
                    "transcribe.so status read answered HTTP " +
                        String(res.status),
                );
            }
            if (res.status < 200 || res.status >= 300) {
                // 401 / 404 on our own row: terminal error-as-data
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = $.optionalGet(res.body, "$.status");
            const timedOut = $.optionalGet(res.body, "$._timed_out") === true;
            if (
                timedOut || status === "pending" || status === "queued" ||
                status === "processing"
            ) {
                // in flight. A long-poll that ran its 25 s returns straight
                // to the next one (default cadence); an EARLY return that
                // moved the row into processing waits 15 s first — the
                // next long-poll would otherwise start within 2 s of a
                // status change and hold for nothing.
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: id,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                    ...(status === "processing" && !timedOut
                        ? { pollAfterMs: 15_000 }
                        : {}),
                };
            }
            if (status === "quoted") {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error: {
                            code: "hold_failed",
                            message:
                                "transcribe.so priced the job but never started it; nothing was charged.",
                        },
                    },
                };
            }
            if (status === "failed" || status === "cancelled") {
                // terminal vendor-side failure while the poll exchange
                // itself succeeded — ours/theirs (design D12). FIXED
                // strings: the row's `error` is internal text (it can name
                // infrastructure or the id) and never rides the output.
                logger.warn("transcribe.so job reached a terminal failure", {
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error: status === "failed"
                            ? {
                                code: "transcription_failed",
                                message:
                                    "transcribe.so could not transcribe this media. The job's hold was released and nothing was charged.",
                            }
                            : {
                                code: "transcription_cancelled",
                                message:
                                    "The transcription was cancelled upstream before it completed.",
                            },
                    },
                };
            }
            if (status !== "completed") {
                // a status we do not know is still in flight, never a
                // success (the kling/minimax D7a posture); runMs bounds it
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: id,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            // completed → the artifacts. Markdown always (it already
            // carries chapters); SRT / VTT only when `formats` asked — the
            // input stays whole (no toRequest), so the flag is readable.
            // `?? null`: the provider ctx types the body as Json | undefined
            // (it serves any endpoint) while JsonUtil takes Json; the schema
            // guarantees an object here.
            const formats = $.optionalGet(data.input.body ?? null, "$.formats");
            const wants = Array.isArray(formats) ? formats : ["markdown"];
            const [md, srt, vtt] = await Promise.all([
                utils.http({
                    method: "GET",
                    url: base + "/transcript",
                    queryParams: {
                        format: "md",
                        speaker_labels: "true",
                        timestamps: "true",
                    },
                }),
                wants.includes("srt")
                    ? utils.http({
                        method: "GET",
                        url: base + "/subtitles",
                        queryParams: { format: "srt" },
                    })
                    : Promise.resolve(undefined),
                wants.includes("vtt")
                    ? utils.http({
                        method: "GET",
                        url: base + "/subtitles",
                        queryParams: { format: "vtt" },
                    })
                    : Promise.resolve(undefined),
            ]);
            for (const read of [md, srt, vtt]) {
                if (read === undefined) continue;
                if (read.status === 429) {
                    const after = Number(read.headers["retry-after"]);
                    const pollAfterMs = Number.isFinite(after) && after > 0
                        ? Math.min(
                            Math.max(Math.ceil(after * 1000), 1_000),
                            120_000,
                        )
                        : 15_000;
                    logger.warn(
                        "transcribe.so rate-limited an artifact read",
                        { pollAfterMs },
                    );
                    return {
                        kind: "RUNNING",
                        state: { externalRunId: id, stage: "completed" },
                        pollAfterMs,
                    };
                }
                if (read.status >= 500) {
                    throw new Error(
                        "transcribe.so artifact read answered HTTP " +
                            String(read.status),
                    );
                }
                if (read.status === 409) {
                    // not_ready: only `transcription_processing` is worth
                    // another tick (the row flipped to completed a moment
                    // before its artifact landed); artifact_missing /
                    // transcription_failed / transcription_cancelled /
                    // not_started never resolve by waiting. The vendor's
                    // 409 text names the id — never copied.
                    const reason = $.optionalGet(read.body, "$.error.reason");
                    if (reason === "transcription_processing") {
                        return {
                            kind: "RUNNING",
                            state: { externalRunId: id, stage: "completed" },
                            pollAfterMs: 2_000,
                        };
                    }
                    logger.warn(
                        "transcribe.so artifact is not available for a completed job",
                        { reason: typeof reason === "string" ? reason : null },
                    );
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: read.status,
                        output: {
                            error: {
                                code: typeof reason === "string" &&
                                        reason !== ""
                                    ? reason
                                    : "artifact_unavailable",
                                message:
                                    "The transcription completed but its transcript artifact is not available.",
                            },
                        },
                    };
                }
                if (read.status < 200 || read.status >= 300) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: read.status,
                        output: {
                            error: {
                                code: "artifact_read_failed",
                                message: "transcribe.so answered HTTP " +
                                    String(read.status) +
                                    " while reading a finished transcript.",
                            },
                        },
                    };
                }
                // an EMPTY string is a legitimate artifact (silent or
                // music-only media has no cues); the transport decodes an
                // empty body to null, so null is accepted too and only a
                // non-text body is malformed
                if (read.body !== null && typeof read.body !== "string") {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: read.status,
                        output: {
                            error: {
                                code: "malformed_artifact",
                                message:
                                    "transcribe.so returned a transcript artifact that is not text.",
                            },
                        },
                    };
                }
            }
            // chapters: title/summary/timing only. `id` and `chapter_index`
            // are dropped, and so is `url` — for a direct-media source it
            // is the transcribe.so dashboard deep-link, which carries the
            // transcription id (the shared-key rule at the top of this file).
            const chaptersRaw = $.optionalGet(res.body, "$.chapters");
            const chapters = [];
            if (Array.isArray(chaptersRaw)) {
                for (const c of chaptersRaw) {
                    if (
                        c === null || typeof c !== "object" || Array.isArray(c)
                    ) {
                        continue;
                    }
                    chapters.push({
                        title: c.title ?? null,
                        summary: c.summary ?? null,
                        start_seconds: c.start_seconds ?? null,
                        end_seconds: c.end_seconds ?? null,
                    });
                }
            }
            // `duration_seconds` is what usage.evidence bills from; the
            // row's `charge_usd` is NOT returned (see the BILLING note at
            // the top). `language` is the DETECTED language when the row
            // has one — the requested value is usually the literal "auto".
            // Built through `merge` so the literal is typed as Json where it
            // is written (the poll's several return literals would otherwise
            // unify into one shape with phantom `error?: undefined` keys).
            const output = $.merge({}, {
                status: "completed",
                language: $.optionalGet(res.body, "$.detected_language") ??
                    $.optionalGet(res.body, "$.language") ?? null,
                duration_seconds:
                    $.optionalGet(res.body, "$.duration_seconds") ??
                        null,
                title: $.optionalGet(res.body, "$.title") ?? null,
                transcript_markdown: md.body,
                ...(srt !== undefined ? { srt: srt.body ?? "" } : {}),
                ...(vtt !== undefined ? { vtt: vtt.body ?? "" } : {}),
                chapters,
            });
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output,
                state: { externalRunId: id, stage: "completed" },
            };
        },
        // no stop — transcribe.so exposes no cancel for a started job
    },
    usage: {
        /** THE credit system (design D26): transcribe.so prices in dollars
         *  (pay-as-you-go retail, $1 per audio hour), so the pool IS
         *  dollars. No `usage.consolidate` (design D6 of this change): the
         *  vendor rounds `charge_usd` (0.03 recorded for 2 minutes vs the
         *  fold's 0.033334), so claiming it would raise the mismatch alarm;
         *  the derived fold is the bill.
         *  model / estimate / evidence live on the endpoint: the rate card
         *  is the endpoint's and the estimate reads its typed body. */
        credits: {
            default: {
                label: "US dollars",
                description:
                    "transcribe.so retail price, pay as you go (US$1 per audio hour).",
            },
        },
    },
});
