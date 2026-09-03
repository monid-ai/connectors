import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zUsage } from "../usage/usage.ts";

/**
 * The run vocabulary, OUT-side — zod-first, flat, `kind`-discriminated
 * variants (monid-services lifecycleResults conventions: prefixed
 * per-variant names, no `{result: …}` nesting to unwrap). These shapes
 * cross process boundaries BY VALUE (Temporal payloads in hosted mode) and
 * Catalog/Broker consume `usage` — contract, not engine internals, hence
 * CORE.
 *
 * Deliberately NOT adopted from monid-services (design D29 +
 * add-async-run-protocol): `providerHttpStatus` (relevant only when in-body
 * error detection lands for sync docs — `isProviderError` IS today's
 * classification), the `actualCost`-on-error channel (usage is doc-settled;
 * vendor error ⇒ zero usage is policy), the `metadata` bag (the lifecycle
 * `state` IS the handle), and `stop.unresolved` (stop is best-effort void —
 * result reporting arrives with the metered wave).
 */
export const zRunCompleted = z.strictObject({
    kind: z.literal("completed"),
    httpStatus: z.number().int(),
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
});
export type RunCompleted = z.infer<typeof zRunCompleted>;

/**
 * A parked async run. ONE shape for both phases (start AND poll — carrying
 * `providerRunId` on poll ticks costs nothing and keeps correlation alive):
 *   - `state`: the opaque Json handle the orchestrator threads into the next
 *     `poll(input, state)` / `stop(input, state)` — ids + billing signals,
 *     never payloads (engine-capped, config schema.state_max_bytes).
 *   - `pollAfterMs`: when to poll next — the fn's per-tick override ?? the
 *     doc's `timeouts.pollMs`.
 *   - `providerRunId`: correlation-only (hosted teardown/webhooks); the
 *     engine never consumes it.
 */
export const zRunRunning = z.strictObject({
    kind: z.literal("running"),
    state: zJson,
    pollAfterMs: z.number().int().positive(),
    providerRunId: z.string().min(1).optional(),
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
