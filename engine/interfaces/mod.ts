import type {
    EndpointDoc,
    FnEntry,
    FnRef,
    HttpMethod,
    Json,
    JsonSchemaDoc,
    OwnedResource,
    ProvisionSeed,
    RefreshOutcome,
    ReleaseOutcome,
    ResourceDoc,
    ResourceQuery,
    RunCompleted,
    RunInput,
    RunPollResult,
    RunResult,
    RunStartResult,
    RunState,
    RunStopResult,
    Usage,
    UsageReading,
    UsageWindow,
    VerifyOutcome,
} from "@shared/core";
import type { Logger } from "@shared/logging";

/**
 * The engine's PUBLIC INTERFACE — monid-services `interfaces/` +
 * implementation pattern. Hosts (the CLI, the test runner, the hosted
 * Temporal worker) code against these shapes, never against the classes.
 */

/** The transport contract. Auth is UNEXECUTED here: the inject fn ref + its
 *  entry travel with the request so any injector (directTransport locally,
 *  the hosted Relay) can verify + run it self-contained. The engine pipeline
 *  never sees credentials. */
export interface PreparedRequest {
    method: HttpMethod;
    /** Absolute, pathParams already substituted. */
    url: string;
    headers: Record<string, string>;
    /** Multimap: `["v"]` is one value; `["a","b"]` is a REPEATED key
     *  (`?k=a&k=b`), appended in order. A list a connector joined for its
     *  vendor (akta, comma) arrives as the single element `["a,b"]`. */
    query: Record<string, string[]>;
    body?: Json;
    /** ABSENT ⇒ the request egresses BARE (no credential injection) — the
     *  same-origin credential rule (design D16): lifecycle fns targeting a
     *  different origin than the doc's request never carry the provider's
     *  credentials. */
    auth?: {
        inject: { ref: FnRef; entry: FnEntry };
        credentials: JsonSchemaDoc;
    };
    /** Credential lookup key (provider name). */
    provider: string;
    timeouts: { requestMs: number };
}

export interface TransportResponse {
    status: number;
    body: string;
    /** The vendor's response headers, keys LOWERCASED (multi-valued
     *  comma-joined per the fetch spec). OPTIONAL so a transport that
     *  does not surface them stays source-compatible; the engine
     *  presents `{}` to fns in that case. */
    headers?: Record<string, string>;
    contentType?: string;
}

/** The only IO port of the engine. Owns credential injection + egress. */
export interface Transport {
    execute(req: PreparedRequest): Promise<TransportResponse>;
}

/** Credential lookup. `fields` are the credential field names the doc's
 *  `auth.credentials` declares — the injector passes them so a resolver can
 *  address each one individually (the env resolver maps them to
 *  `<PROVIDER>_CREDENTIALS_<FIELD>`). A resolver that ignores `fields`
 *  stays assignable; absent, it means the default `{apiKey}` shape. */
export type ParamsResolver = (
    provider: string,
    fields?: readonly string[],
) => Promise<Record<string, string>>;

/**
 * The HOST's ownership window (design D32) — the second engine port
 * beside Transport, READ-ONLY by construction: rows of the CALLING
 * workspace's owned resources (the host binds the workspace; the engine
 * never sees tenancy). Backing store is the host's problem (Postgres
 * hosted, a fixture map in tests, empty locally). Empty array = owns
 * none — never an error.
 */
export interface ResourceReader {
    owned(query: ResourceQuery): Promise<OwnedResource[]>;
}

/**
 * The resource STORE port (design D46) — the reader plus writes,
 * speaking the RESOURCE VERBS. Hosts (monid-services) and local tooling
 * implement it; the ENGINE consumes only the reader half. A host that
 * already implements ResourceReader completes the store with four
 * methods.
 */
export interface IResourceStore extends ResourceReader {
    /** Persist a provision seed as an owned instance. */
    provision(resource: OwnedResource): Promise<void>;
    /** Replace the stored data snapshot (a refresh patch). */
    refresh(id: string, externalId: string, data: Json): Promise<void>;
    /** Mark released — the instance leaves the ownership window. */
    release(id: string, externalId: string): Promise<void>;
    get(id: string, externalId: string): Promise<OwnedResource | undefined>;
    list(): Promise<OwnedResource[]>;
}

export interface EngineCtx {
    /** The only IO port — owns credential injection + egress. */
    transport: Transport;
    now?: () => Date;
    /** Injectable sleeper for `run()`'s poll loop AND lifecycle
     *  `utils.sleep` (tests replay instantly); default = real setTimeout.
     *  Never used by start/poll/stop scheduling itself. */
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
    /** REQUIRED (at load) for docs carrying a `resource` binding —
     *  absent there fails NO_RESOURCE_READER, fail-closed. Unbound docs
     *  never touch it. */
    resources?: ResourceReader;
    /** The seed ADMISSION port: `run()` hands `ensure`'s seeds here
     *  BEFORE start() executes, so the ownership gate sees them (the
     *  reader is read-only by design — admission is the host's write).
     *  Hosts that drive phases themselves call `ensure()` and persist
     *  on their own; `run()` without this port WARNS loudly when seeds
     *  surface (they are logged, not persisted — keyed gates may 404). */
    admit?: (seeds: ProvisionSeed[]) => Promise<void>;
    /** The opaque scope token handed to `ensure` fns as `scope.key` — a
     *  stable name for the calling workspace (hosted: an opaque tenant
     *  hash; local default "local"). Never carries meaning. */
    scopeKey?: string;
    logger?: Logger;
}

/** Result shapes live in @shared/core (schema/run/result.ts — zod-first,
 *  flat, kind-discriminated; they cross process boundaries by value).
 *  Re-exported here so hosts import the engine interface in one place. */
export type { RunCompleted, RunPollResult, RunResult, RunStartResult };

/** Load side: sealed unit in, runnable endpoint/resource out (fail-closed
 *  gates). */
export interface ConnectorEngine {
    load(unitJson: unknown): Promise<RunnableEndpoint>;
    /** Resource sealed unit ({resourceDoc, fns}) in, runnable resource
     *  out — the host-driven op surface (check/release/refresh/billing/
     *  externals; design D30/D31/D33). */
    loadResource(unitJson: unknown): Promise<RunnableResource>;
}

/**
 * Execution side: Temporal-activity-shaped (start/poll/stop stateless,
 * strict-JSON in/out, no sleeps) + the OSS `run()` loop (the only sleeper).
 *
 * poll/stop take the caller's runInput ALONGSIDE the threaded state: the
 * input is re-derived deterministically (validate + input.toRequest) so
 * lifecycle fns see the same input on every tick — hosts (Temporal
 * activities) have the payload by value anyway. `stop` is best-effort and
 * idempotent: without a lifecycle.stop it resolves immediately; with one it
 * runs the fn and swallows EVERY failure (cleanup never masks the outcome).
 */
/** The run's host-stable identity, threaded into every phase as
 *  ctx.data.run — the deterministic seed for vendor idempotency keys.
 *  Hosts SHOULD pass the same value across start/poll/stop of one run;
 *  absent, each phase call mints its own UUID (valid, but idempotency
 *  keys then differ across activity retries). `run()` mints once. */
export interface RunHandle {
    runId: string;
}

export interface RunnableEndpoint {
    readonly doc: EndpointDoc;
    /** Cost estimate — PURE (no IO, no state): validated input →
     *  estimated Usage. `elapsedMs` (design D40) re-runs the SAME
     *  estimate mid-flight for docs declaring
     *  `usage.updateEstimateEveryMs` — the price is an estimation, and
     *  it syncs on that cadence. */
    estimate(runInput: RunInput, elapsedMs?: number): Usage;
    /** Sugar: `estimate(runInput, elapsedMs)` for cadenced docs; the
     *  static estimate otherwise. */
    accrued(runInput: RunInput, elapsedMs: number): Usage;
    /** PRE-RUN prerequisites (design D32, v1 ensureResources): runs the
     *  binding's `ensure` fn (validated input + the host scope token) and
     *  returns the provision seeds the host must PERSIST BEFORE calling
     *  start() — a mid-run crash never orphans an upstream resource.
     *  No binding / no ensure ⇒ []. Hosts call it as its own activity;
     *  the OSS run() calls it inline. */
    ensure(runInput: RunInput): Promise<ProvisionSeed[]>;
    start(runInput: RunInput, run?: RunHandle): Promise<RunStartResult>;
    poll(
        runInput: RunInput,
        state: RunState,
        run?: RunHandle,
    ): Promise<RunPollResult>;
    /** Teardown with a voice (design D34): COMPLETED settles metered
     *  work through the one pipeline; UNRESOLVED demands out-of-band
     *  reconciliation; STOPPED_UNSETTLED is the classic best-effort
     *  posture. NEVER throws for fn failures (cleanup never masks the
     *  outcome). */
    stop(
        runInput: RunInput,
        state: RunState,
        run?: RunHandle,
    ): Promise<RunStopResult>;
    run(
        runInput: RunInput,
        opts?: { signal?: AbortSignal },
    ): Promise<RunCompleted>;
}

/**
 * Execution surface of a loaded RESOURCE doc — the host-driven lifecycle
 * (schedules, holds, boundary settles own the WHEN; these own the HOW).
 * Every method takes the OWNED INSTANCE (validated against the doc's
 * data schema on the way in — defense against host drift); non-
 * deterministic failures throw RESOURCE_OP_FAILED (retriable).
 */
export interface RunnableResource {
    readonly doc: ResourceDoc;
    /** Aliveness (v1's word) — the host calls it before EVERY charge;
     *  never charge a dead resource. */
    verify(resource: OwnedResource): Promise<VerifyOutcome>;
    /** Idempotent upstream teardown (404/410 = success); may return the
     *  vendor's settled final usage. */
    release(resource: OwnedResource): Promise<ReleaseOutcome>;
    /** Re-sync the stored snapshot; errors when the doc declares no
     *  refresh op. */
    refresh(resource: OwnedResource): Promise<RefreshOutcome>;
    /** The per-line cumulative meter (design D39) — errors when the
     *  line has no reconciler. */
    reconcileUsage(
        line: string,
        resource: OwnedResource,
        window: UsageWindow,
    ): Promise<UsageReading>;
    /** A named LIVE view of the upstream object (design D42). */
    view(kind: string, resource: OwnedResource, args?: Json): Promise<Json>;
}
