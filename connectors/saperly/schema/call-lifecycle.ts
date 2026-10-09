import type {
    LifecycleStopOutcome,
    LifecycleTickData,
    LifecycleUtils,
} from "@shared/core";
import type { HookLogger } from "@shared/core";
import type { LifecycleOutcome } from "@shared/core";

/**
 * The SHARED call-run lifecycle (v1 `calls/place-call.ts` pollCallRun /
 * stopCallRun): the run-side of a live call is identical whether WE
 * placed it (/place-calls) or the caller did (/inbound-calls) — both poll
 * `GET /calls/{id}` and hang up via `POST /calls/{id}/end`. Authored ONCE
 * as closed-term consts: both endpoints reference the same fn values, so
 * the compiler interns ONE fnTable entry per fn (content dedupe — billing
 * truth is provably the same code either way).
 *
 * TERMINALITY (v1): Saperly publishes NO call-status enum — a non-null
 * `costCents` is the authoritative terminal signal (the carrier settles
 * cost "moments later" than status); the observed status set is the fast
 * path. SETTLE RACE: a terminal STATUS alone is not billing-ready (the
 * 53s→"0 minutes" bug) — poll parks terminal-but-unsettled records on a
 * deterministic `graceLeft` countdown (fns have no clock): 24 ticks at
 * the 5 s override ≈ 120 s, then the record is accepted as-is (a record
 * that never settles must not hang the run).
 */

export const pollCallRun = async (
    { data, utils, logger }: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
): Promise<LifecycleOutcome> => {
    const $ = utils.json;
    const callId = data.lifecycle.state.externalRunId;
    if (callId === undefined) {
        throw Object.assign(
            new Error("saperly call poll without externalRunId in state"),
            { retriable: false },
        );
    }
    const res = await utils.http({
        method: "GET",
        path: "/calls/" + callId,
    });
    if (res.status >= 500) {
        // retriable read — never conclude from a flaky poll
        throw new Error(
            "saperly call poll failed with HTTP " + res.status,
        );
    }
    if (res.status >= 400) {
        // terminal error-as-data — the call record vanished; nothing to
        // meter (evidence reads no durationSec/costCents ⇒ zero)
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const cost = $.optionalNum(res.body, "$.costCents");
    const status = ($.optionalStr(res.body, "$.status") ?? "").toLowerCase();
    const terminal = cost !== undefined || [
        "completed",
        "ended",
        "failed",
        "busy",
        "no-answer",
        "no_answer",
        "canceled",
        "cancelled",
    ].includes(status);
    if (!terminal) {
        return { kind: "RUNNING", state: { externalRunId: callId } };
    }
    if (cost === undefined) {
        // terminal status, unsettled billing — the settle-race grace
        const left = data.lifecycle.state.data === undefined
            ? 24
            : $.optionalNum(data.lifecycle.state.data, "$.graceLeft") ?? 24;
        if (left > 0) {
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: callId,
                    data: { graceLeft: left - 1 },
                },
                pollAfterMs: 5_000,
            };
        }
        logger.warn(
            "saperly call settle grace expired — billing from available fields",
            { callId, callStatus: status },
        );
    }
    return {
        kind: "COMPLETED",
        httpStatus: res.status,
        output: res.body,
        state: { externalRunId: callId },
    };
};

export const stopCallRun = async (
    { data, utils, logger }: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
): Promise<LifecycleStopOutcome | void> => {
    const $ = utils.json;
    const callId = data.lifecycle.state.externalRunId;
    if (callId === undefined) {
        return {
            kind: "UNRESOLVED",
            reason: "no call id in state — nothing to hang up",
        };
    }
    // the carrier hangup — idempotent; "already ended" (404/409/410)
    // counts as a successful hangup
    const end = await utils.http({
        method: "POST",
        path: "/calls/" + callId + "/end",
        headers: { "Idempotency-Key": callId + ":end" },
        body: {},
    });
    logger.info("saperly call end requested", {
        callId,
        status: end.status,
    });
    const hangupOk = (end.status >= 200 && end.status < 300) ||
        end.status === 404 || end.status === 409 || end.status === 410;
    if (!hangupOk) {
        return {
            kind: "UNRESOLVED",
            reason: "hangup failed with HTTP " + end.status,
            state: { externalRunId: callId },
        };
    }
    // the end response may already carry the SETTLED record (costCents
    // present — a terminal status alone is not billing-ready)
    if ($.optionalNum(end.body, "$.costCents") !== undefined) {
        return {
            kind: "COMPLETED",
            httpStatus: end.status,
            output: end.body,
            state: { externalRunId: callId },
        };
    }
    // bounded in-phase settle-wait: 10 × 3 s re-reads
    for (let attempt = 0; attempt < 10; attempt++) {
        await utils.sleep(3_000);
        const res = await utils.http({
            method: "GET",
            path: "/calls/" + callId,
        });
        if (res.status < 200 || res.status >= 300) continue;
        if ($.optionalNum(res.body, "$.costCents") !== undefined) {
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { externalRunId: callId },
            };
        }
    }
    // the host reconciles (elapsed-based last resort) before money settles
    return {
        kind: "UNRESOLVED",
        reason: "call ended but the carrier never settled in budget",
        state: { externalRunId: callId },
    };
};

/**
 * The SHARED billing evidence (v1 `callBilling`): INTEGER connected
 * seconds — a call that never connected bills ZERO (ring time never
 * bills) — UNLESS the carrier settled a charge, in which case seconds
 * derive from the charge itself (never bill 0 for a call the carrier
 * billed us for).
 */
export const callEvidence = (
    { data, utils }: {
        data: { output: import("@shared/core").Json };
        utils: {
            json: {
                optionalNum(
                    value: import("@shared/core").Json,
                    path: string,
                ): number | undefined;
            };
        };
    },
): { counts: Record<string, number> } => {
    const $ = utils.json;
    const duration = $.optionalNum(data.output, "$.durationSec");
    if (duration !== undefined && duration > 0) {
        return { counts: { SECOND: Math.round(duration) } };
    }
    const cost = $.optionalNum(data.output, "$.costCents");
    const rate = $.optionalNum(data.output, "$.rateCentsPerMin");
    if (
        cost !== undefined && cost > 0 && rate !== undefined && rate > 0
    ) {
        return { counts: { SECOND: Math.round((cost / rate) * 60) } };
    }
    return { counts: { SECOND: 0 } };
};

/** The SHARED vendor claim (v1 actualCost): the carrier-settled charge —
 *  absent until the carrier finalizes (falls back to the derived fold). */
export const callConsolidate = (
    { data, utils }: {
        data: { output: import("@shared/core").Json };
        utils: {
            json: {
                optionalNum(
                    value: import("@shared/core").Json,
                    path: string,
                ): number | undefined;
            };
        };
    },
): { credits: Record<string, number> } => {
    const cents = utils.json.optionalNum(data.output, "$.costCents");
    return cents === undefined
        ? { credits: {} }
        : { credits: { default: cents / 100 } };
};

/** The SHARED estimate (design D40 — one fn, two moments): at admission
 *  `elapsedMs` is absent → the 60 s floor prices the initial hold of an
 *  UNBOUNDED call; on `updateEstimateEveryMs` re-runs it prices the
 *  elapsed seconds — the estimation that syncs while the call is live. */
export const callEstimate = (
    { data }: { data: { elapsedMs?: number } },
): { counts: Record<string, number> } => ({
    counts: {
        SECOND: Math.max(Math.ceil((data.elapsedMs ?? 0) / 1000), 60),
    },
});
