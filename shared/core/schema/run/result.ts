import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zUsage } from "../usage/usage.ts";
import { zLifecycleRunning } from "../hooks/lifecycle.ts";
import { RunKind, zRunState } from "./state.ts";

/**
 * The run vocabulary, OUT-side — zod-first, flat, `kind`-discriminated
 * variants (monid-services lifecycleResults conventions: prefixed
 * per-variant names, no `{result: …}` nesting to unwrap). These shapes
 * cross process boundaries BY VALUE (Temporal payloads in hosted mode) and
 * Catalog/Broker consume `usage` — contract, not engine internals, hence
 * CORE.
 *
 * Adopted from monid-services with async (design D12): the ours/theirs
 * status pair — as an OPTIONAL `providerHttpStatus` (stated only when a
 * lifecycle fn synthesized the billed status; v1 required it verbatim
 * everywhere). Deliberately NOT adopted: the `actualCost`-on-error channel
 * (usage is doc-settled; vendor error ⇒ zero usage is policy), the
 * `metadata` bag and `providerRunId` field (the lifecycle `state` IS the
 * handle — `state.externalRunId`), and `stop.unresolved` (stop is
 * best-effort void — result reporting arrives with the metered wave).
 */

/**
 * Settle-side timing report — ENGINE-stamped from the threaded
 * `state.timing` + the injected clock, mapping 1:1 onto the ClickHouse
 * latency waterfall's provider slices (v1 analytics/schema/schema.ts):
 * `startRequestMs` → t_provider_start_request_ms, `pollMsTotal` →
 * t_provider_polling_ms, `providerTotalMs` → t_provider_total_ms.
 * Declarative (sync) runs report it too (`attempts: 0, pollMsTotal: 0`) —
 * hosts emit usage events uniformly, no lifecycle special case. Host-side
 * slices (queue/gate/save…) stay host-measured, exactly as in v1.
 */
export const zRunTiming = z.strictObject({
    startedAt: z.iso.datetime(),
    completedAt: z.iso.datetime(),
    attempts: z.number().int().nonnegative(),
    startRequestMs: z.number().int().nonnegative(),
    pollMsTotal: z.number().int().nonnegative(),
    providerTotalMs: z.number().int().nonnegative(),
});
export type RunTiming = z.infer<typeof zRunTiming>;

export const zRunCompleted = z.strictObject({
    kind: z.literal(RunKind.COMPLETED),
    httpStatus: z.number().int(),
    /**
     * THEIRS — what the upstream exchange actually returned, stated ONLY
     * when a lifecycle fn SYNTHESIZED `httpStatus` (e.g. a failed Apify
     * actor: httpStatus 500, providerHttpStatus 200). Absent = relayed
     * verbatim (the v1 ours/theirs pair, optional form — design D12).
     */
    providerHttpStatus: z.number().int().optional(),
    output: zJson.nullable(),
    usage: zUsage,
    /**
     * The ENGINE's authoritative classification (vendor non-2xx is DATA, not
     * an exception) — it drives zero-usage forcing and callers must not
     * re-derive it from httpStatus. For lifecycle docs an in-body vendor
     * failure is classified here via the fn-synthesized httpStatus (e.g. a
     * failed Apify actor completes as a 500 envelope).
     */
    isProviderError: z.boolean(),
    timing: zRunTiming,
});
export type RunCompleted = z.infer<typeof zRunCompleted>;

/**
 * A parked async run — the ENGINE-side shape, DERIVED from the fn-side
 * `zLifecycleRunning` (one definition, one extend; they stay in sync by
 * construction). The engine ADDS information at this boundary:
 *   - `state`: the FULL validated RunState (fn patch merged + engine-owned
 *     `timing`) the orchestrator threads into the next `poll(input, state)`
 *     / `stop(input, state)`.
 *   - `pollAfterMs`: RESOLVED (required) — the fn's per-tick override ??
 *     the doc's `timeouts.pollMs`.
 */
export const zRunRunning = zLifecycleRunning.extend({
    state: zRunState,
    pollAfterMs: z.number().int().positive(),
});
export type RunRunning = z.infer<typeof zRunRunning>;

/** What `start`/`poll` return; `run()` returns RunCompleted directly. The
 *  per-phase aliases exist for interface clarity — the shapes are identical
 *  by decision (having the id on poll doesn't hurt). */
export const zRunResult = z.discriminatedUnion("kind", [
    zRunCompleted,
    zRunRunning,
]);
export type RunResult = z.infer<typeof zRunResult>;

export const zRunStartResult = zRunResult;
export type RunStartResult = RunResult;
export const zRunPollResult = zRunResult;
export type RunPollResult = RunResult;
