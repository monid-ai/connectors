import { z } from "zod";
import {
    defineProvider,
    type Json,
    presets,
    type TypedLifecycleOutcome,
    type TypedLifecycleStartCtx,
    type TypedLifecycleTickCtx,
} from "@shared/core";

/**
 * Apify — the canonical ASYNC provider (monid-services' reference example):
 * the whole actor-run lifecycle lives ONCE here at provider level (the v2
 * form of v1's `actorRunLifecycle(actorId)` attached to every def), and
 * every endpoint reduces to pure data — meta + start request (actorId baked
 * into the path) + input schema (+ a usage.model/estimate declaration).
 *
 * Ported from monid-services `adaptors/apify/endpoints/actor-run.ts`:
 *   - start: POST the endpoint's request (`/v2/acts/{owner~name}/runs`) —
 *     Apify API errors (non-2xx) are DATA (COMPLETED, zero-billed by the
 *     engine); a 2xx without a run id is an Apify contract violation
 *     (throw → EXECUTION_FAILED); else park with `externalRunId` + the
 *     dataset id stashed in the typed `data` bag.
 *   - poll: GET /v2/actor-runs/{id} — no exitCode → still RUNNING (state
 *     ABSENT: the previous fn-state carries forward wholesale, D21 —
 *     there is no field-level merge); SUCCEEDED → fetch the default
 *     dataset's items (the BARE item array); actor failure → synthesized
 *     500 error-as-data (the engine zero-bills it).
 *   - stop: best-effort POST /v2/actor-runs/{id}/abort — non-2xx expected
 *     for already-terminal runs (logged, ignored; the engine swallows the
 *     rest).
 *
 * BILLING IS THE DECLARED MODEL, not the vendor's run-record total
 * (owner decision 2026-09-17): Apify's `usageTotalUsd` aggregates ASYNC
 * and lags run completion by ~3-10 s (measured: mean 6.4 s, p95 ~9.6 s),
 * so the number visible at settle time is structurally unreliable — and
 * waiting for it would tax every run's latency. No `usage.consolidate`
 * anywhere in this connector: each doc's pinned card × the evidence
 * counts IS the bill (the engine's derived fold), and the offline drift
 * guard (`deno task drift --provider apify`) is the watchdog for vendor
 * repricing. Known, accepted residual: a few actors' real cost can
 * exceed the modeled price (compute overhead, scraped-vs-returned
 * units) — documented as code comments on those docs' models.
 *
 * TYPED STATE (`lifecycle.state` → doc.lifecycle.stateSchema): a
 * discriminated union on `phase` — the fn-owned `data` bag is
 * engine-validated each tick, and each phase carries exactly what that
 * phase knows (no half-written bags).
 */

/** The fn-owned state bag, per phase. */
const zRunPhase = z.discriminatedUnion("phase", [
    /** Parked run — written by start, carried forward by every
     *  still-running poll tick. */
    z.strictObject({
        phase: z.literal("running"),
        /** Default dataset id — the results fetch target (absent when the
         *  start response omitted it; the terminal poll re-reads it from
         *  the run record). */
        datasetId: z.string().min(1).optional(),
    }),
    /** Terminal tick — the run settled on its dataset. */
    z.strictObject({
        phase: z.literal("settled"),
        datasetId: z.string().min(1),
    }),
]);
type RunPhase = z.output<typeof zRunPhase>;

/*
 * start/poll are HOISTED with explicit contracts (annotations live on the
 * const, OUTSIDE the closed-term fn source): defineProvider's generic
 * co-inference does not contextually type inline fns, so the union's
 * literal `phase` discriminant would widen to `string` and fail the
 * check. The extracted source (fn.toString()) is unchanged by this.
 */

const start: (
    ctx: TypedLifecycleStartCtx<Json | undefined>,
) => Promise<TypedLifecycleOutcome<RunPhase>> = async (
    { data, utils, logger },
) => {
    logger.info("starting apify actor run", {
        url: data.request.url,
    });
    // the DEFAULT RELAY: method/url/headers from the compiled
    // request, body/queryParams from the caller input
    const res = await utils.request();
    if (res.status < 200 || res.status >= 300) {
        // Apify API error (actor not found, rate limit) — DATA.
        return {
            kind: "COMPLETED",
            httpStatus: res.status,
            output: res.body,
        };
    }
    const runId = utils.json.optionalGet(res.body, "$.data.id");
    if (typeof runId !== "string" || runId === "") {
        // 2xx without a run id: Apify contract violation → infra.
        throw new Error("Apify did not return a run id");
    }
    const datasetId = utils.json.optionalGet(
        res.body,
        "$.data.defaultDatasetId",
    );
    const phase = "running";
    return {
        kind: "RUNNING",
        state: {
            // the vendor's run id — the correlation handle hosts
            // read (↔ v1 providerRunId)
            externalRunId: runId,
            data: {
                phase,
                ...(typeof datasetId === "string" && datasetId !== ""
                    ? { datasetId }
                    : {}),
            },
        },
    };
};

const poll: (
    ctx: TypedLifecycleTickCtx<Json | undefined, RunPhase>,
) => Promise<TypedLifecycleOutcome<RunPhase>> = async (
    { data, utils, logger },
) => {
    // typed own-state read (D24): the threaded state is typed by the
    // provider's OWN lifecycle.state schema. A missing run id is
    // corrupted thread state — deterministic (never retriable).
    const runId = data.lifecycle.state.externalRunId;
    if (runId === undefined) {
        throw Object.assign(
            new Error("apify poll without externalRunId in state"),
            { retriable: false },
        );
    }
    const res = await utils.http({
        method: "GET",
        path: "/v2/actor-runs/" + encodeURIComponent(runId),
    });
    if (res.status < 200 || res.status >= 300) {
        // Apify API error during polling — DATA.
        return {
            kind: "COMPLETED",
            httpStatus: res.status,
            output: res.body,
        };
    }
    const exitCode = utils.json.optionalNum(
        res.body,
        "$.data.exitCode",
    );
    if (exitCode === undefined) {
        // still running — state ABSENT: the previous fn-state carries
        // forward wholesale (D21; there is no field-level merge)
        return { kind: "RUNNING" };
    }
    const status = utils.json.optionalGet(res.body, "$.data.status");
    if (exitCode === 0 && status === "SUCCEEDED") {
        // The run settles IMMEDIATELY on its terminal tick. The run
        // record's `usageTotalUsd` is deliberately NOT read: it
        // aggregates ~3-10 s behind completion (measured), and billing
        // comes from the doc's declared model + evidence counts — the
        // engine's derived fold (owner decision 2026-09-17).
        const datasetId = utils.json.optionalGet(
            res.body,
            "$.data.defaultDatasetId",
            // raw vendor probing above; the FALLBACK is a typed
            // own-state read (stashed by start — D24)
        ) ?? data.lifecycle.state.data?.datasetId;
        if (typeof datasetId !== "string" || datasetId === "") {
            throw new Error("Apify run has no default dataset id");
        }
        const items = await utils.http({
            method: "GET",
            path: "/v2/datasets/" + encodeURIComponent(datasetId) +
                "/items",
        });
        if (items.status < 200 || items.status >= 300) {
            return {
                kind: "COMPLETED",
                httpStatus: items.status,
                output: items.body,
            };
        }
        const phase = "settled";
        return {
            kind: "COMPLETED",
            httpStatus: 200,
            output: Array.isArray(items.body) ? items.body : [],
            state: {
                externalRunId: runId,
                data: { phase, datasetId },
            },
        };
    }
    // actor failed (exit code ≠ 0) — synthesized 500 error-as-data;
    // the engine zero-bills every non-2xx envelope.
    const message = utils.json.optionalGet(
        res.body,
        "$.data.statusMessage",
    );
    logger.warn("apify actor run failed", { runId, exitCode });
    return {
        kind: "COMPLETED",
        // OURS synthesized (the ACTOR failed) / THEIRS was a 200
        // (the poll exchange itself succeeded) — design D12
        httpStatus: 500,
        providerHttpStatus: 200,
        output: {
            message: typeof message === "string" && message !== ""
                ? message
                : "Actor failed with exit code " + String(exitCode),
        },
    };
};

export default defineProvider({
    name: "apify",
    meta: {
        displayName: "Apify",
        summary:
            "Run Apify actors — hosted web scrapers for social, maps, jobs, and commerce data.",
        description:
            "Run Apify actors: hosted web scrapers and automation programs " +
            "covering LinkedIn, Instagram, X (Twitter), YouTube, Google " +
            "Maps, and hundreds of other sources. Each endpoint starts one " +
            "actor run with a typed input, polls it to completion, and " +
            "returns the run's dataset items. Runs are asynchronous — " +
            "typical completion is seconds to a few minutes depending on " +
            "the actor and requested volume.",
        homepageUrl: "https://apify.com",
        docsUrl: "https://docs.apify.com/api/v2",
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.apify.com" },
    // mirrors services/workflows/endpointExecution/config.yml (apify):
    // request 30s, run 300s, poll every 2s
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_000 },
    lifecycle: {
        state: zRunPhase,
        start,
        poll,
        stop: async ({ data, utils, logger }) => {
            // typed own-state read (D24); stop is best-effort — the engine
            // swallows the throw either way
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                throw Object.assign(
                    new Error("apify stop without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "POST",
                path: "/v2/actor-runs/" + encodeURIComponent(runId) +
                    "/abort",
            });
            if (res.status < 200 || res.status >= 300) {
                // already-terminal runs / transient API errors are expected
                logger.warn("apify abort failed (best-effort, ignored)", {
                    runId,
                    status: res.status,
                });
            }
        },
    },
    output: {
        // THE error-digestion hook (design D12) — v1's per-call-site
        // apifyErrorBody normalization as ONE provider-level projection:
        // runs only on provider-error envelopes, after zero-usage forcing.
        // Handles both shapes — the Apify API error envelope ({error:
        // {message, type}}) and lifecycle-synthesized bodies ({message}) —
        // and keeps the raw body under `raw` (digest, never hide).
        fromError: ({ data, utils }) => {
            const nested = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const flat = utils.json.optionalGet(data.output, "$.message");
            const type = utils.json.optionalGet(data.output, "$.error.type");
            const message = typeof nested === "string"
                ? nested
                : typeof flat === "string"
                ? flat
                : "Apify API error";
            return {
                message,
                ...(typeof type === "string" ? { type } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        /** THE credit system (design D26): apify meters directly in US
         *  dollars (no tier-independent pool unit exists — per-event
         *  prices tier by OUR subscription plan), so the pool IS dollars:
         *  every endpoint's model pins its survey-verified per-line $
         *  draws, and the drift guard (apify:pricing) alarms on vendor
         *  repricing. One pool ⇒ id `default`. */
        credits: { default: { label: "US dollars" } },
        // NO usage.consolidate — deliberate (owner decision 2026-09-17).
        // The run record's `usageTotalUsd` aggregates asynchronously and
        // lags completion by ~3-10 s, so any claim read at settle time can
        // be a partial; rather than waiting or guard-reading it, the
        // engine's derived fold (declared model × evidence counts) IS the
        // bill for every actor. Vendor repricing is the offline drift
        // guard's job, not a per-run signal.
        // No provider-level model/estimate defaults: every ENDPOINT declares
        // its own — the rate card and the estimate fields are per-actor
        // facts, pinned beside the input schema that defines them.
        /** The generic QUANTITIES default (design D27): dataset items
         *  keyed by the doc's OWN model — leaf → the unit; composite →
         *  the sole metered line id (single-valued by the compiler's
         *  ≥2-metered rule; multi-metered actors declare their own fns). */
        evidence: ({ data }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            let key;
            switch (data.usage.model.kind) {
                case "PER_UNIT":
                    key = data.usage.model.unit;
                    break;
                case "COMPOSITE":
                    key = Object.entries(data.usage.model.components)
                        .find(([, component]) => component.kind === "PER_UNIT")
                        ?.[0];
                    break;
                case "PER_CALL":
                case "FREE":
                    key = undefined;
                    break;
            }
            return { counts: key === undefined ? {} : { [key]: items } };
        },
    },
});
