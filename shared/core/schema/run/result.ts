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
 * Deliberately NOT adopted from monid-services (design D29):
 * `providerHttpStatus` (relevant only when in-body error detection lands —
 * `isProviderError` IS today's classification), the `actualCost`-on-error
 * channel (usage is doc-settled; vendor error ⇒ zero usage is policy),
 * `metadata`, `stop.unresolved` + `providerRunId` (async is reserved; when
 * it lands, this splits into per-phase RunStartResult/RunPollResult with
 * derived variants so shapes cannot drift).
 */
export const zRunCompleted = z.strictObject({
    kind: z.literal("completed"),
    httpStatus: z.number().int(),
    output: zJson.nullable(),
    usage: zUsage,
    /**
     * The ENGINE's authoritative classification (vendor non-2xx is DATA, not
     * an exception) — it drives zero-usage forcing and callers must not
     * re-derive it from httpStatus (vendors that signal errors in-body with
     * HTTP 200 will be classified here when doc-level detection lands).
     */
    isProviderError: z.boolean(),
});
export type RunCompleted = z.infer<typeof zRunCompleted>;

/** Reserved for async endpoints at a later engine version. */
export const zRunRunning = z.strictObject({
    kind: z.literal("running"),
    state: zJson,
    pollAfterMs: z.number().int().positive(),
});
export type RunRunning = z.infer<typeof zRunRunning>;

/** What `start`/`poll` return; `run()` returns RunCompleted directly. */
export const zRunResult = z.discriminatedUnion("kind", [
    zRunCompleted,
    zRunRunning,
]);
export type RunResult = z.infer<typeof zRunResult>;
