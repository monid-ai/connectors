import { z } from "zod";
import { zHttpMethod } from "../common/http.ts";
import { type Json, zJson } from "../json/type.ts";
import { zRunInput } from "../run/input.ts";
import { fnCarrier, type FnUtils } from "./ctx.ts";

/**
 * THE LIFECYCLE HOOK FAMILY — `lifecycle.start` / `lifecycle.poll` /
 * `lifecycle.stop`: the async run protocol (design: add-async-run-protocol).
 *
 * Unlike the four pure hooks, lifecycle fns are EFFECTFUL-BY-CAPABILITY:
 * they receive `utils.http` (the v2 provider runtime — every call goes
 * through the engine's ONE transport port, auth injected at egress, so fns
 * never see credentials) and `utils.log`. They are the v2 form of
 * monid-services' `runLifecycle` hooks: imperative fns that sequence their
 * own HTTP calls (e.g. Apify's poll = status GET + dataset GET in one tick),
 * relay vendor errors AS DATA, and thread opaque `state` between ticks.
 *
 * The amended IO invariant: "all IO happens in the engine" becomes "all IO
 * flows through the engine's transport port". Preserved by construction:
 * auth custody, fixture replay (transport-level), billing determinism
 * (usage.consolidate stays the only settle authority; the engine forces zero
 * usage on non-2xx httpStatus, so a fn cannot bill an error), closed terms
 * (the capability is passed in, never imported).
 *
 * Enforcement differs from the pure hooks (which use z.function.implement):
 * lifecycle fns are ASYNC, so the engine validates ctx.data before the call
 * and the OUTCOME after the awaited return (FN_CONTRACT on either), lets
 * EngineErrors (e.g. transport EXECUTION_FAILED from utils.http) propagate
 * untouched, and maps any other uncaught throw to EXECUTION_FAILED
 * (retriable) — monid-services' ProviderError posture. The z.function
 * factory is not used here (zod fn factories don't model Promise returns);
 * the data/outcome schemas below ARE the contract.
 */

// ---------------------------------------------------------------------------
// utils.http — the provider runtime (v1 `ProviderRuntime.client.request`)
// ---------------------------------------------------------------------------

/**
 * One HTTP call issued by a lifecycle fn. CONSTRUCTED FROM the doc's request
 * + auth, per-call overridable: `path` resolves against the doc request
 * URL's origin (v1 `apiPath` semantics); an absolute `url` may target any
 * host ("fns can do whatever they want" — egress hygiene is transport/Relay
 * policy in hosted mode). `headers` merge OVER the doc's request headers;
 * `requestMs` overrides the doc's per-request timeout. Auth is ALWAYS
 * injected by the transport and is not overridable (custody).
 */
export const zHttpCall = z.strictObject({
    method: zHttpMethod,
    /** Absolute target. Exactly one of `url` | `path`. */
    url: z.url().optional(),
    /** Resolved against the doc request URL's origin. */
    path: z.string().regex(/^\//, "path must start with /").optional(),
    headers: z.record(z.string(), z.string()).optional(),
    queryParams: z.record(z.string(), z.string()).optional(),
    body: zJson.optional(),
    requestMs: z.number().int().positive().optional(),
}).refine(
    (call) => (call.url !== undefined) !== (call.path !== undefined),
    { message: "exactly one of url | path" },
);
export type HttpCall = z.infer<typeof zHttpCall>;

/** What utils.http returns: status + sniff-decoded body. Vendor non-2xx is
 *  RETURNED (data), never thrown — the fn decides; transport failures throw
 *  EXECUTION_FAILED through the fn (retriable). */
export interface HttpResult {
    status: number;
    body: Json;
}

export type LifecycleHttpFn = (call: HttpCall) => Promise<HttpResult>;

/** Structured logging for lifecycle fns (v1 `client.logger` parity) —
 *  routed to EngineCtx.logger, silent no-op by default. */
export interface LogUtil {
    debug(message: string, fields?: Record<string, Json>): void;
    info(message: string, fields?: Record<string, Json>): void;
    warn(message: string, fields?: Record<string, Json>): void;
    error(message: string, fields?: Record<string, Json>): void;
}

/** The lifecycle hooks' utils: the pure ABI + the effect capabilities. */
export interface LifecycleUtils extends FnUtils {
    http: LifecycleHttpFn;
    log: LogUtil;
}

export const zLifecycleUtils = z.custom<LifecycleUtils>(
    (value) =>
        typeof value === "object" && value !== null && "json" in value &&
        "money" in value && "http" in value && "log" in value,
    "expected LifecycleUtils ({ json, money, http, log })",
);

// ---------------------------------------------------------------------------
// ctx.data shapes
// ---------------------------------------------------------------------------

/** The doc's compiled request as DATA INTO the lifecycle: {pathParam}s
 *  already substituted, headers merged. By convention `start` executes it
 *  via utils.http; fns may deviate freely. */
export const zLifecycleRequestInfo = z.strictObject({
    method: zHttpMethod,
    url: z.string().min(1),
    headers: z.record(z.string(), z.string()).optional(),
});
export type LifecycleRequestInfo = z.infer<typeof zLifecycleRequestInfo>;

/** ctx.data for lifecycle.start — the validated (post-toRequest) input +
 *  the compiled request. */
export const zLifecycleStartData = z.strictObject({
    input: zRunInput,
    request: zLifecycleRequestInfo,
});
export type LifecycleStartData = z.infer<typeof zLifecycleStartData>;

/** ctx.data for lifecycle.poll / lifecycle.stop — plus the threaded state
 *  (the opaque Json handle the previous tick returned). */
export const zLifecycleTickData = z.strictObject({
    input: zRunInput,
    request: zLifecycleRequestInfo,
    state: zJson,
});
export type LifecycleTickData = z.infer<typeof zLifecycleTickData>;

// ---------------------------------------------------------------------------
// outcomes
// ---------------------------------------------------------------------------

/**
 * A run still in flight. `state` carries IDENTITY + BILLING SIGNALS (run
 * ids, dataset ids, pricing fields, attempt counters) — never payloads: it
 * travels BY VALUE every tick (Temporal payloads, run records, fixtures) and
 * the engine caps its serialized size (config schema.state_max_bytes →
 * FN_CONTRACT). `providerRunId` is correlation-only (hosted teardown /
 * webhooks) — the state IS the handle. `pollAfterMs` overrides the doc's
 * `timeouts.pollMs` for the NEXT tick only (adaptive cadence).
 */
export const zLifecycleRunning = z.strictObject({
    kind: z.literal("running"),
    state: zJson,
    providerRunId: z.string().min(1).optional(),
    pollAfterMs: z.number().int().positive().optional(),
});

/**
 * The run's RAW envelope: `httpStatus` + `output` feed the ONE settle
 * pipeline exactly like a declarative response would (non-2xx ⇒ provider
 * error, zero usage — engine-forced; a fn synthesizes e.g. a 500 for
 * in-body vendor failures, v1 parity). `state` (absent = previous tick's)
 * rides into the settle envelope so usage.consolidate can read billing
 * signals stashed during polling.
 */
export const zLifecycleCompleted = z.strictObject({
    kind: z.literal("completed"),
    httpStatus: z.number().int(),
    output: zJson,
    state: zJson.optional(),
});

export const zLifecycleOutcome = z.discriminatedUnion("kind", [
    zLifecycleRunning,
    zLifecycleCompleted,
]);
export type LifecycleOutcome = z.infer<typeof zLifecycleOutcome>;

// ---------------------------------------------------------------------------
// fn types + carriers
// ---------------------------------------------------------------------------

export type LifecycleStartFn = (
    ctx: { data: LifecycleStartData; utils: LifecycleUtils },
) => Promise<LifecycleOutcome>;
export const zLifecycleStartFn = fnCarrier<LifecycleStartFn>(
    "a lifecycle.start fn",
);

export type LifecyclePollFn = (
    ctx: { data: LifecycleTickData; utils: LifecycleUtils },
) => Promise<LifecycleOutcome>;
export const zLifecyclePollFn = fnCarrier<LifecyclePollFn>(
    "a lifecycle.poll fn",
);

/** Best-effort teardown: the return is ignored; the engine swallows every
 *  failure (cleanup never masks the run outcome — v1 stop posture). */
export type LifecycleStopFn = (
    ctx: { data: LifecycleTickData; utils: LifecycleUtils },
) => Promise<void>;
export const zLifecycleStopFn = fnCarrier<LifecycleStopFn>(
    "a lifecycle.stop fn",
);
