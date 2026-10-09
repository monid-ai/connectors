import { z } from "zod";
import { zHttpMethod } from "../common/http.ts";
import { type Json, zJson } from "../json/type.ts";
import { zRunInput } from "../run/input.ts";
import { RunKind, zFnState, zRunState } from "../run/state.ts";
import { fnCarrier, type FnUtils, type HookLogger } from "./ctx.ts";
import {
    type OwnedResource,
    type ResourceQuery,
    zOwnedResource,
} from "../resource/row.ts";

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
 * One HTTP call issued by a lifecycle fn — ZERO defaults: every field sent
 * is a field stated here. `path` resolves against the doc request URL's
 * origin (v1 `apiPath` semantics); an absolute `url` may target any HTTPS
 * host, but credentials are injected ONLY for same-origin targets (design
 * D16 — the same-origin credential rule; cross-origin calls go out bare).
 * `headers` ARE the complete outbound header set (no doc-header merge);
 * `requestMs` overrides the doc's per-request timeout. Auth injection is
 * transport-side and not overridable (custody).
 */
export const zHttpCall = z.strictObject({
    method: zHttpMethod,
    /** Absolute HTTPS target. Exactly one of `url` | `path`. */
    url: z.url({ protocol: /^https$/ }).optional(),
    /** Resolved against the doc request URL's origin. */
    path: z.string().regex(/^\//, "path must start with /").optional(),
    headers: z.record(z.string(), z.string()).optional(),
    /** Author-friendly: a scalar, or SEVERAL values under one key. The
     *  engine normalizes both into the wire multimap — an array is sent
     *  as a repeated key (`?k=a&k=b`). An EMPTY array is allowed and
     *  means "no value for this key": the engine drops it, exactly as it
     *  does on the declarative path, so a fn building params dynamically
     *  (`{ids: someList}`) needs no length guard. The min-1 floor belongs
     *  on the WIRE shape (`zHttpRequestParts.query`), which is what the
     *  normalizer produces — never on the authoring input. */
    queryParams: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())]),
    ).optional(),
    body: zJson.optional(),
    requestMs: z.number().int().positive().optional(),
}).refine(
    (call) => (call.url !== undefined) !== (call.path !== undefined),
    { message: "exactly one of url | path" },
);
export type HttpCall = z.infer<typeof zHttpCall>;

/** What utils.http returns: status + response headers + sniff-decoded body.
 *  Vendor non-2xx is RETURNED (data), never thrown — the fn decides; transport
 *  failures throw EXECUTION_FAILED through the fn (retriable). */
export interface HttpResult {
    status: number;
    /** The VENDOR'S RESPONSE headers, keys LOWERCASED — envelope facts a
     *  vendor answers WITH instead of a body (a 302's `location` IS the
     *  payload for an endpoint whose answer is the redirect target — a
     *  presigned URL minted per request; `retry-after`, `content-range` and
     *  `link` pagination are the same shape). Always present ({} when the
     *  transport reports none), so fns never branch on presence. REQUEST
     *  headers — where credentials live — stay invisible to fns: redirects
     *  are never followed, so a credential never travels to the target
     *  either (design D16). */
    headers: Record<string, string>;
    body: Json;
}

export type LifecycleHttpFn = (call: HttpCall) => Promise<HttpResult>;

/**
 * `utils.sleep(ms)` — a bounded in-phase wait (design D34): drain-polling
 * inside ONE phase call (saperly's stop hangs up, then watches the call
 * settle). Host-clock injectable (EngineCtx.sleep), so tests never wall-
 * wait. Bounded twice, both → FN_CONTRACT (a doc-authoring bug, not a
 * vendor fault): per call ≤ SLEEP_MAX_MS_PER_CALL, cumulative per phase
 * invocation ≤ SLEEP_BUDGET_MS. Long waits belong to the POLL CADENCE
 * (pollAfterMs), not to sleeping inside a phase.
 */
export type LifecycleSleepFn = (ms: number) => Promise<void>;

export const SLEEP_MAX_MS_PER_CALL = 30_000;
export const SLEEP_BUDGET_MS = 120_000;

/**
 * `utils.resources` — the run-scoped OWNERSHIP window (design D32): rows
 * of the running workspace's resources, served by the HOST's
 * ResourceReader port. STRUCTURALLY WITHHELD unless the doc declares a
 * `resource` binding: undeclared docs get a stub that throws
 * RESOURCES_UNDECLARED (capability follows declaration, like utils.http
 * itself). Empty array = owns none — a fn-level decision follows (relay a
 * vendor-shaped 404, provision, etc.), never an engine error.
 */
export interface LifecycleResources {
    owned(query: ResourceQuery): Promise<OwnedResource[]>;
}

/**
 * Per-call overrides for `utils.request()` — the DEFAULT RELAY (v1's
 * "default HTTP relay" as a callable): it executes THE endpoint's compiled
 * request, initialized from `data.request` + the caller input —
 * method/url/headers from the compiled request, `body ?? input.body`,
 * `queryParams ?? input.queryParams` — with a PRESENCE-BASED merge: any
 * field here overrides per call, absent fields fall through. That includes
 * the TARGET (`url` | `path` — at most one): `utils.request` can do
 * anything `utils.http` can; the difference is defaults (request = the
 * compiled request's, http = none). Same-origin credential rule (D16) and
 * https-only apply identically.
 */
export const zRequestOverrides = z.strictObject({
    method: zHttpMethod.optional(),
    /** Absolute HTTPS target override. At most one of `url` | `path`. */
    url: z.url({ protocol: /^https$/ }).optional(),
    /** Path override, resolved against the doc request URL's origin. */
    path: z.string().regex(/^\//, "path must start with /").optional(),
    headers: z.record(z.string(), z.string()).optional(),
    queryParams: z.record(z.string(), zJson).optional(),
    body: zJson.optional(),
    requestMs: z.number().int().positive().optional(),
}).refine(
    (o) => o.url === undefined || o.path === undefined,
    { message: "at most one of url | path" },
);
export type RequestOverrides = z.infer<typeof zRequestOverrides>;

export type LifecycleRequestFn = (
    overrides?: RequestOverrides,
) => Promise<HttpResult>;

/** The lifecycle hooks' utils: the pure ABI + the effect capabilities —
 *  `http` (raw, explicit), `request` (the default relay), `sleep`
 *  (bounded in-phase waits) and `resources` (the ownership window —
 *  a throwing stub unless the doc declares a binding). Logging is NOT
 *  here: `ctx.logger` is its own ctx member (every hook has it). */
export interface LifecycleUtils extends FnUtils {
    http: LifecycleHttpFn;
    request: LifecycleRequestFn;
    sleep: LifecycleSleepFn;
    resources: LifecycleResources;
}

export const zLifecycleUtils = z.custom<LifecycleUtils>(
    (value) =>
        typeof value === "object" && value !== null && "json" in value &&
        "money" in value && "http" in value && "request" in value &&
        "sleep" in value && "resources" in value,
    "expected LifecycleUtils ({ json, money, http, request, sleep, resources })",
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

/** The run's own identity as ctx data (design D34): `runId` is the
 *  HOST-STABLE run identifier (host-supplied; the engine mints a UUID
 *  when absent) — the deterministic seed for vendor idempotency keys
 *  (saperly's provision saga), stable across activity retries so retried
 *  effects converge upstream. */
export const zLifecycleRunInfo = z.strictObject({
    runId: z.string().min(1),
});
export type LifecycleRunInfo = z.infer<typeof zLifecycleRunInfo>;

/** The GATED INSTANCES (design D43): every keyed binding's owned
 *  resource, by alias (`as` ?? the key path's last segment) — fetched
 *  fresh each tick from the host's reader, already ownership-gated.
 *  Absent when the doc declares no keyed bindings. */
export const zGatedResources = z.record(
    z.string().min(1),
    zOwnedResource,
);
export type GatedResources = z.infer<typeof zGatedResources>;

/** ctx.data for lifecycle.start — the validated (post-toRequest) input +
 *  the compiled request + the run identity (+ the gated instances when
 *  the doc's bindings carry keys). */
export const zLifecycleStartData = z.strictObject({
    input: zRunInput,
    request: zLifecycleRequestInfo,
    run: zLifecycleRunInfo,
    resources: zGatedResources.optional(),
});
export type LifecycleStartData = z.infer<typeof zLifecycleStartData>;

/** ctx.data for lifecycle.poll / lifecycle.stop — plus the threaded state
 *  at its provenance-named path `data.lifecycle.state` (the FULL
 *  structured RunState: the previous tick's fn-owned fields + the
 *  engine-owned timing, which fns may READ — adaptive cadence off
 *  attempts/deadlineAt — but not write; they return zFnState). */
export const zLifecycleTickData = z.strictObject({
    input: zRunInput,
    request: zLifecycleRequestInfo,
    run: zLifecycleRunInfo,
    resources: zGatedResources.optional(),
    lifecycle: z.strictObject({ state: zRunState }),
});
export type LifecycleTickData = z.infer<typeof zLifecycleTickData>;

// ---------------------------------------------------------------------------
// outcomes
// ---------------------------------------------------------------------------

/**
 * A run still in flight. `state` is the fn-owned WHOLE next state
 * (zFnState): `externalRunId` (the vendor's run/job id — the correlation
 * handle hosts read: teardown, webhooks), `stage` (dispatch marker) and
 * `data` (billing signals: dataset ids, pricing fields — never payloads).
 * WHOLE-STATE semantics: PRESENT replaces the previous fn-state
 * wholesale; ABSENT carries it forward untouched (no field-level merge —
 * design D21). The engine stamps `timing` itself, validates `data`
 * against the doc's `lifecycle.stateSchema` when declared, and caps the
 * WHOLE state's serialized size (config schema.state_max_bytes →
 * FN_CONTRACT). `pollAfterMs` overrides the doc's `timeouts.pollMs` for
 * the NEXT tick only (adaptive cadence).
 */
export const zLifecycleRunning = z.strictObject({
    kind: z.literal(RunKind.RUNNING),
    state: zFnState.optional(),
    pollAfterMs: z.number().int().positive().optional(),
});

/**
 * The run's RAW envelope: `httpStatus` + `output` feed the ONE settle
 * pipeline exactly like a declarative response would (non-2xx ⇒ provider
 * error, zero usage — engine-forced). `providerHttpStatus` (THEIRS, v1's
 * ours/theirs pair — design D12) is stated ONLY when the fn SYNTHESIZED
 * `httpStatus` (e.g. a failed actor: httpStatus 500, providerHttpStatus
 * 200 — the upstream exchange itself succeeded); absent = relayed
 * verbatim. `state` is the final fn-owned WHOLE state (absent = the
 * previous tick's fn-state carries forward untouched — design D21); the
 * final state rides into the settle envelope so usage.consolidate can
 * read billing signals stashed during polling.
 */
export const zLifecycleCompleted = z.strictObject({
    kind: z.literal(RunKind.COMPLETED),
    httpStatus: z.number().int(),
    providerHttpStatus: z.number().int().optional(),
    output: zJson,
    state: zFnState.optional(),
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
    ctx: {
        data: LifecycleStartData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
) => Promise<LifecycleOutcome>;
export const zLifecycleStartFn = fnCarrier<LifecycleStartFn>(
    "a lifecycle.start fn",
);

export type LifecyclePollFn = (
    ctx: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
) => Promise<LifecycleOutcome>;
export const zLifecyclePollFn = fnCarrier<LifecyclePollFn>(
    "a lifecycle.poll fn",
);

/**
 * Stop OUTCOMES (design D34) — stop grows a voice: the engine's stop
 * verdict is one of
 *   - COMPLETED          — the fn drained to a terminal vendor state and
 *     returned a full `zLifecycleCompleted` envelope: the run SETTLES
 *     through the one pipeline (metered work that already happened bills
 *     at stop — saperly's hangup).
 *   - UNRESOLVED         — the fn tore down but could NOT observe the
 *     terminal state in its bounded budget: the host must reconcile
 *     out-of-band before money settles.
 *   - STOPPED_UNSETTLED  — the fn returned void (fire-and-forget teardown,
 *     the pre-resource posture) or the doc has no stop fn / no state to
 *     stop; nothing billed, nothing owed.
 * Failures still never mask the stop: a THROW from the fn is swallowed
 * and reported as UNRESOLVED when the doc bills metered work (someone
 * must go look), STOPPED_UNSETTLED otherwise.
 */
export const StopKind = {
    UNRESOLVED: "UNRESOLVED",
    STOPPED_UNSETTLED: "STOPPED_UNSETTLED",
} as const;
export type StopKind = (typeof StopKind)[keyof typeof StopKind];

export const zStopKind = z.enum(StopKind);

export const zLifecycleUnresolved = z.strictObject({
    kind: z.literal(StopKind.UNRESOLVED),
    /** Operator-facing: what the fn last saw (logged + surfaced). */
    reason: z.string().min(1).optional(),
    state: zFnState.optional(),
});
export type LifecycleUnresolved = z.infer<typeof zLifecycleUnresolved>;

export const zLifecycleStopOutcome = z.discriminatedUnion("kind", [
    zLifecycleCompleted,
    zLifecycleUnresolved,
]);
export type LifecycleStopOutcome = z.infer<typeof zLifecycleStopOutcome>;

/** Teardown with a voice: return an outcome to settle/flag, or void for
 *  the classic best-effort posture. The engine swallows every failure
 *  (cleanup never masks the run outcome — v1 stop posture). */
export type LifecycleStopFn = (
    ctx: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
) => Promise<LifecycleStopOutcome | void>;
export const zLifecycleStopFn = fnCarrier<LifecycleStopFn>(
    "a lifecycle.stop fn",
);
