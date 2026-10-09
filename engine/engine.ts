import { greaterThan, parse as parseSemver } from "@std/semver";
import {
    assembleUsage,
    bindingAlias,
    contractConfig,
    countsMismatch,
    creditsDisagree,
    type EndpointDoc,
    type EnvelopeData,
    type FnState,
    type FnUsage,
    formatZodError,
    type GatedResources,
    getPath,
    type HookLogger,
    type Json,
    type LifecycleOutcome,
    type LifecycleRequestInfo,
    type LifecycleUtils,
    type OwnedResource,
    type ProvisionSeed,
    pruneZeroCredits,
    type RefreshOutcome,
    type ReleaseOutcome,
    RESOURCE_GATE_ORDER,
    type ResourceDoc,
    type ResourceEffects,
    type ResourcePurpose,
    type ResourceTarget,
    type RunCompleted,
    type RunInput,
    RunKind,
    type RunPollResult,
    type RunStartResult,
    type RunState,
    type RunStopResult,
    type RunTiming,
    type RunTimingInFlight,
    StopKind,
    type Usage,
    type UsageReading,
    type UsageWindow,
    type VerifyOutcome,
    zeroUsage,
    zOwnedResource,
    zResourceSealedUnit,
    zRunState,
    zSealedUnit,
} from "@shared/core";
import type { Logger } from "@shared/logging";
import denoJson from "./deno.json" with { type: "json" };
import type {
    ConnectorEngine,
    EngineCtx,
    ResourceReader,
    RunHandle,
    RunnableEndpoint,
    RunnableResource,
} from "./interfaces/mod.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";
import {
    type LinkedFns,
    type LinkedResourceFns,
    linkFns,
    linkResourceFns,
} from "./link.ts";
import {
    makeLifecycleUtils,
    makeResourceOpUtils,
    makeResourcesWindow,
    toHookLogger,
    undeclaredResources,
} from "./fn-utils.ts";
import { buildRequest, substituteUrl, validateInput } from "./request.ts";
import { sniffDecode } from "./transport.ts";
import { validateAgainst } from "./validate.ts";

/** The compatibility contract — the engine package version IS the version. */
export const ENGINE_VERSION: string = denoJson.version;

/**
 * Default: silent. The engine stays standalone (no pino at import time —
 * `Logger` is a type-only seam); hosts that want logs (CLI, hosted workers)
 * pass a real logger through EngineCtx.logger.
 */
const NOOP_LOGGER: Logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child: () => NOOP_LOGGER,
};

export class Engine implements ConnectorEngine {
    private readonly logger: Logger;

    constructor(private readonly ctx: EngineCtx) {
        this.logger = ctx.logger ?? NOOP_LOGGER;
    }

    /**
     * Parse + gate + link a sealed unit {doc, fns}. All gates fail closed:
     * BAD_DOC → UNSUPPORTED_DOC → UNKNOWN_FN → LINK_INTEGRITY → UNSUPPORTED_FN_ABI.
     * Linked fns are wrapped in their hook contracts (FN_CONTRACT).
     */
    async load(unitJson: unknown): Promise<LoadedEndpoint> {
        const parsed = zSealedUnit.safeParse(unitJson);
        if (!parsed.success) {
            throw new EngineError(
                EngineErrorCode.BAD_DOC,
                `sealed unit invalid: ${formatZodError(parsed.error)}`,
            );
        }
        const { doc, fns } = parsed.data;
        if (
            greaterThan(
                parseSemver(doc.minEngineVersion),
                parseSemver(ENGINE_VERSION),
            )
        ) {
            throw new EngineError(
                EngineErrorCode.UNSUPPORTED_DOC,
                `${doc.id} needs engine ${doc.minEngineVersion}, this engine is ${ENGINE_VERSION}`,
            );
        }
        // D32 fail-closed: a bound endpoint without its ownership window
        // must not run — caught HERE (host wiring), never mid-run.
        if (doc.resources && !this.ctx.resources) {
            throw new EngineError(
                EngineErrorCode.NO_RESOURCE_READER,
                `${doc.id} declares resource bindings but EngineCtx ` +
                    `carries no ResourceReader`,
            );
        }
        const hookLogger = toHookLogger(this.logger);
        const linked = await linkFns(doc, fns, ENGINE_VERSION, hookLogger);
        this.logger.debug("loaded endpoint", { id: doc.id });
        return new LoadedEndpoint(
            doc,
            fns[doc.auth.inject.$fn.key],
            linked,
            this.ctx,
            this.logger,
        );
    }

    /** Parse + gate + link a RESOURCE sealed unit ({resourceDoc, fns}) —
     *  same fail-closed gate ladder as endpoints. */
    async loadResource(unitJson: unknown): Promise<LoadedResource> {
        const parsed = zResourceSealedUnit.safeParse(unitJson);
        if (!parsed.success) {
            throw new EngineError(
                EngineErrorCode.BAD_DOC,
                `resource sealed unit invalid: ${formatZodError(parsed.error)}`,
            );
        }
        const { doc, fns } = parsed.data;
        if (
            greaterThan(
                parseSemver(doc.minEngineVersion),
                parseSemver(ENGINE_VERSION),
            )
        ) {
            throw new EngineError(
                EngineErrorCode.UNSUPPORTED_DOC,
                `${doc.id} needs engine ${doc.minEngineVersion}, this engine is ${ENGINE_VERSION}`,
            );
        }
        const hookLogger = toHookLogger(this.logger);
        const linked = await linkResourceFns(
            doc,
            fns,
            ENGINE_VERSION,
            hookLogger,
        );
        this.logger.debug("loaded resource", { id: doc.id });
        return new LoadedResource(
            doc,
            fns[doc.auth.inject.$fn.key],
            linked,
            this.ctx,
            this.logger,
        );
    }
}

/** One keyed binding's resolved gate work: WHICH purpose declared it
 *  (the settle-mark bucket), the vendor target, and the alias its gated
 *  instance rides under in `data.resources`. */
interface GatedTarget {
    purpose: ResourcePurpose;
    alias: string;
    target: ResourceTarget;
}

export class LoadedEndpoint implements RunnableEndpoint {
    constructor(
        readonly doc: EndpointDoc,
        private readonly injectEntry: Parameters<typeof buildRequest>[2],
        private readonly fns: LinkedFns,
        private readonly ctx: EngineCtx,
        private readonly logger: Logger,
    ) {}

    /** utils.http/request bound PER INVOCATION: this tick's derived input +
     *  substituted request (the v2 provider runtime). `sleep` is budget-
     *  bounded per invocation; `resources` is the real ownership window
     *  iff the doc declares a binding (design D32 — capability follows
     *  declaration), else the RESOURCES_UNDECLARED stub. */
    private utilsFor(
        input: RunInput,
        requestInfo: LifecycleRequestInfo,
    ): LifecycleUtils {
        return makeLifecycleUtils({
            doc: this.doc,
            injectEntry: this.injectEntry,
            transport: this.ctx.transport,
            requestInfo,
            input,
            sleep: (ms) => (this.ctx.sleep ?? sleep)(ms),
            resources: this.doc.resources && this.ctx.resources
                ? makeResourcesWindow(this.doc.id, this.ctx.resources)
                : undeclaredResources(this.doc.id),
        });
    }

    /** The KEYED bindings' ownership TARGETS for this call — every
     *  purpose's JSONPath `key` resolved against the VALIDATED
     *  (pre-toRequest) input, in canonical gate order (uses → updates →
     *  releases → reads, declaration order within). Keyless bindings
     *  resolve nothing (anchor endpoints derive ownership in-fn); an
     *  unresolvable/non-string key is the CALLER's fault (the input
     *  simply does not name a resource) → INVALID_INPUT. */
    private resolveTargets(runInput: RunInput): GatedTarget[] {
        const section = this.doc.resources;
        if (!section) return [];
        const input = validateInput(this.doc, runInput);
        const targets: GatedTarget[] = [];
        for (const purpose of RESOURCE_GATE_ORDER) {
            const declared: Array<{ id: string; key?: string; as?: string }> =
                section[purpose] ?? [];
            for (const binding of declared) {
                if (binding.key === undefined) continue;
                const value = getPath(input as unknown as Json, binding.key);
                if (typeof value !== "string" || value.length === 0) {
                    throw new EngineError(
                        EngineErrorCode.INVALID_INPUT,
                        `${this.doc.id}: resources.${purpose} key ` +
                            `${binding.key} did not resolve to a non-empty ` +
                            `string in the validated input`,
                    );
                }
                targets.push({
                    purpose,
                    // the alias exists by construction: keyed ⇒ aliased
                    alias: bindingAlias(binding) as string,
                    target: { resource: binding.id, externalId: value },
                });
            }
        }
        return targets;
    }

    /** The D32 ownership PRE-GATE over ALL keyed bindings, plus the D43
     *  instance gather: every gated row rides into the lifecycle fns as
     *  `data.resources[alias]`. Not owned ⇒ the uniform vendor-shaped
     *  404 AS DATA — zero usage, upstream never touched, shaped exactly
     *  like a provider miss so callers need no new branch. `lenient`
     *  (stop's posture — teardown proceeds) skips missing rows instead
     *  of missing the run. */
    private async gatherGated(
        runInput: RunInput,
        lenient = false,
    ): Promise<
        | { miss: RunCompleted }
        | { targets: GatedTarget[]; instances?: GatedResources }
    > {
        const targets = this.resolveTargets(runInput);
        if (targets.length === 0) return { targets };
        // reader presence is a load() invariant for bound docs
        const reader = this.ctx.resources as ResourceReader;
        const window = makeResourcesWindow(this.doc.id, reader);
        const instances: GatedResources = {};
        for (const { target, alias } of targets) {
            const rows = await window.owned({
                resource: target.resource,
                externalId: target.externalId,
            });
            if (rows.length === 0) {
                if (lenient) continue;
                const at = this.now().toISOString();
                return {
                    miss: {
                        kind: RunKind.COMPLETED,
                        httpStatus: 404,
                        output: {
                            error: "not_found",
                            message: `resource ${target.resource} ` +
                                `"${target.externalId}" is not owned by ` +
                                `this workspace`,
                        },
                        usage: zeroUsage(),
                        isProviderError: true,
                        timing: {
                            startedAt: at,
                            completedAt: at,
                            attempts: 0,
                            startRequestMs: 0,
                            pollMsTotal: 0,
                            providerTotalMs: 0,
                        },
                    },
                };
            }
            instances[alias] = rows[0];
        }
        return { targets, instances };
    }

    // ---- Temporal-activity-shaped: stateless, strict-JSON in/out, no sleeps ----

    /** Pre-run cost estimate (v1 paymentLifecycle.estimate): validated
     *  input → the QUANTITY promise per metered line — PURE, no IO, no
     *  state; compile-REQUIRED on every doc (the billing triple, D25;
     *  the absent-fn arm below is defense in depth only). The ENGINE
     *  appends the model's flat 1s and folds through the doc's OWN rate
     *  card (design D26): the returned Usage is `{credits, evidence}` —
     *  the priced vector plus the per-line why, re-derivable by anyone
     *  holding the doc. */
    estimate(runInput: RunInput, elapsedMs?: number): Usage {
        // PRE-toRequest input (design D25): the estimate is a promise about
        // the CALLER's request, so it reads the schema-shaped validated
        // input (defaults materialized) — NOT the wire reshape (akta's
        // toRequest CSV-joins arrays; typed queryParams stay sound here).
        const input = validateInput(this.doc, runInput);
        const model = this.doc.usage.model;
        let fnUsage: FnUsage = { counts: {} };
        if (this.fns.usageEstimate) {
            fnUsage = this.fns.usageEstimate({
                input,
                // design D40: absent at admission; set on cadenced re-runs
                ...(elapsedMs !== undefined ? { elapsedMs } : {}),
                usage: { model },
            });
            // the fn's promise: metered line quantities only
            this.validateUsage(fnUsage);
        }
        return assembleUsage(model, fnUsage.counts);
    }

    /** PRE-RUN prerequisites (design D32) — its own method so hosts can
     *  persist the returned seeds BEFORE start() executes (v1 ordering:
     *  a mid-run crash never orphans an upstream resource). */
    async ensure(runInput: RunInput): Promise<ProvisionSeed[]> {
        if (!this.fns.ensures || this.fns.ensures.length === 0) return [];
        // ctx.data.input is the VALIDATED (pre-toRequest) input — the
        // fn-facing contract; utils bind to the DERIVED input so
        // utils.request() sends post-toRequest body/query consistent
        // with the derived URL.
        const input = validateInput(this.doc, runInput);
        const derived = this.deriveInput(runInput);
        const request = this.requestInfo(derived);
        const seeds: ProvisionSeed[] = [];
        // sequential, canonical order (uses then reads) — a later ensure
        // may depend on an earlier one's provision
        for (const ensure of this.fns.ensures) {
            seeds.push(
                ...await ensure(
                    { input, scope: { key: this.ctx.scopeKey ?? "local" } },
                    this.utilsFor(derived, request),
                ),
            );
        }
        return seeds;
    }

    async start(
        runInput: RunInput,
        run?: RunHandle,
    ): Promise<RunStartResult> {
        const doc = this.doc;
        const input = this.deriveInput(runInput);
        const t0 = this.now();

        // D32 ownership pre-gate — before ANY upstream effect, both modes;
        // the gated instances (D43) ride into the lifecycle fns.
        const gated = await this.gatherGated(runInput);
        if ("miss" in gated) return gated.miss;

        // LIFECYCLE mode: the start fn replaces the declarative execution —
        // the compiled request rides in as DATA (ctx.data.request).
        if (this.fns.lifecycleStart) {
            const request = this.requestInfo(input);
            const outcome = await this.fns.lifecycleStart(
                {
                    input,
                    request,
                    run: this.runInfo(run),
                    ...(gated.instances !== undefined &&
                            Object.keys(gated.instances).length > 0
                        ? { resources: gated.instances }
                        : {}),
                },
                this.utilsFor(input, request),
            );
            return this.fromOutcome(
                outcome,
                input,
                undefined,
                t0,
                gated.targets,
            );
        }

        // DECLARATIVE mode (sync): one request, engine-executed.
        // 1. build request — auth travels UNEXECUTED (credentials stay out of the pipeline)
        const request = buildRequest(doc, input, this.injectEntry);
        // 2. transport: injection + egress inside the port  → EXECUTION_FAILED (retriable)
        const response = await this.ctx.transport.execute(request);
        // 3. sniffing decode: JSON if it parses, else the faithful raw string
        const completedAt = this.now();
        return this.settle(
            input,
            response.status,
            sniffDecode(response),
            undefined,
            undefined,
            gated.targets,
            {
                startedAt: t0.toISOString(),
                completedAt: completedAt.toISOString(),
                attempts: 0,
                startRequestMs: Math.max(
                    0,
                    completedAt.getTime() - t0.getTime(),
                ),
                pollMsTotal: 0,
                providerTotalMs: Math.max(
                    0,
                    completedAt.getTime() - t0.getTime(),
                ),
            },
        );
    }

    /**
     * One poll tick. The caller's input is RE-DERIVED deterministically
     * (validate + input.toRequest) so lifecycle fns see the same input as
     * start — under Temporal each tick is a separate activity holding the
     * payload by value anyway. The threaded `state` is RE-VALIDATED on the
     * way in (zRunState + the doc's stateSchema — defense against
     * host-side payload corruption).
     */
    async poll(
        runInput: RunInput,
        state: RunState,
        run?: RunHandle,
    ): Promise<RunPollResult> {
        if (!this.fns.lifecyclePoll) {
            throw new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} has no lifecycle.poll — not a pollable endpoint`,
            );
        }
        const prevState = this.parseThreadedState(state);
        const input = this.deriveInput(runInput);
        const request = this.requestInfo(input);
        const t0 = this.now();
        // re-gate per tick (each tick is a separate stateless activity);
        // the fresh instances ride in — a host-side refresh mid-run is
        // VISIBLE to the fn, by design
        const gated = await this.gatherGated(runInput);
        if ("miss" in gated) return gated.miss;
        const outcome = await this.fns.lifecyclePoll(
            {
                input,
                request,
                run: this.runInfo(run),
                ...(gated.instances !== undefined &&
                        Object.keys(gated.instances).length > 0
                    ? { resources: gated.instances }
                    : {}),
                lifecycle: { state: prevState },
            },
            this.utilsFor(input, request),
        );
        return this.fromOutcome(
            outcome,
            input,
            prevState,
            t0,
            gated.targets,
        );
    }

    /**
     * Teardown WITH A VOICE (design D34): a COMPLETED outcome from the fn
     * settles through the one pipeline (metered work that already
     * happened bills at stop); UNRESOLVED demands host reconciliation;
     * void (or no stop fn / a swallowed failure on an unmetered doc) is
     * STOPPED_UNSETTLED — the exact pre-resource posture, now stated.
     * NEVER throws for fn failures (cleanup never masks the outcome):
     * a throw on a doc that bills mid-run work (updateEstimateEveryMs)
     * surfaces
     * as UNRESOLVED — someone must go look before money settles.
     */
    async stop(
        runInput: RunInput,
        state: RunState,
        run?: RunHandle,
    ): Promise<RunStopResult> {
        if (!this.fns.lifecycleStop) {
            return { kind: StopKind.STOPPED_UNSETTLED };
        }
        const prevState = this.parseThreadedState(state);
        const t0 = this.now();
        try {
            const input = this.deriveInput(runInput);
            const request = this.requestInfo(input);
            // LENIENT gather — teardown proceeds even when a row is gone
            // mid-run (missing instances are simply absent from the map)
            const gated = await this.gatherGated(runInput, true);
            const instances = "miss" in gated ? undefined : gated.instances;
            const targets = "miss" in gated ? [] : gated.targets;
            const outcome = await this.fns.lifecycleStop(
                {
                    input,
                    request,
                    run: this.runInfo(run),
                    ...(instances !== undefined &&
                            Object.keys(instances).length > 0
                        ? { resources: instances }
                        : {}),
                    lifecycle: { state: prevState },
                },
                this.utilsFor(input, request),
            );
            if (outcome === undefined) {
                return { kind: StopKind.STOPPED_UNSETTLED };
            }
            if (outcome.kind === RunKind.COMPLETED) {
                return this.fromOutcome(
                    outcome,
                    input,
                    prevState,
                    t0,
                    targets,
                ) as RunCompleted;
            }
            // UNRESOLVED — merge the last known state for the host
            const fnFields = this.nextFnState(outcome.state, prevState);
            const timing = this.advanceTiming(
                prevState.timing,
                t0,
                Math.max(0, this.now().getTime() - t0.getTime()),
            );
            const lastState: RunState = { ...fnFields, timing };
            this.assertState(lastState);
            return {
                kind: StopKind.UNRESOLVED,
                ...(outcome.reason !== undefined
                    ? { reason: outcome.reason }
                    : {}),
                state: lastState,
            };
        } catch (error) {
            this.logger.warn("lifecycle.stop failed (never masks the run)", {
                id: this.doc.id,
                error: String(error),
            });
            // a metered doc's failed teardown is a money question — flag it
            if (this.doc.usage.updateEstimateEveryMs !== undefined) {
                return {
                    kind: StopKind.UNRESOLVED,
                    reason: `lifecycle.stop failed: ${error}`,
                    state: prevState,
                };
            }
            return { kind: StopKind.STOPPED_UNSETTLED };
        }
    }

    // ---- OSS orchestrator: the ONLY place that sleeps. Never used under Temporal
    // (the hosted workflow re-implements this loop with workflow.sleep). ----

    async run(
        runInput: RunInput,
        opts?: { signal?: AbortSignal },
    ): Promise<RunCompleted> {
        const doSleep = this.ctx.sleep ?? sleep;
        const deadline = this.now().getTime() + this.doc.timeouts.runMs;
        // ONE identity for the whole run — idempotency keys stay stable
        // across every phase of this loop.
        const run: RunHandle = { runId: crypto.randomUUID() };
        // inline ensure (v1 ordering): seeds are handed to the host's
        // ADMISSION port before start() executes, so the ownership gate
        // sees them. Without the port they are logged LOUDLY, never
        // silently dropped (hosted callers run ensure() as its own
        // pre-start activity and persist themselves).
        const seeds = await this.ensure(runInput);
        if (seeds.length > 0) {
            const named = seeds.map((seed) => ({
                resource: seed.resource,
                externalId: seed.externalId,
            }));
            if (this.ctx.admit) {
                await this.ctx.admit(seeds);
                this.logger.info("ensure seeds admitted", {
                    id: this.doc.id,
                    seeds: named,
                });
            } else {
                this.logger.warn(
                    "ensure produced seeds but EngineCtx carries no " +
                        "admit port — NOT persisted; keyed ownership " +
                        "gates may answer 404",
                    { id: this.doc.id, seeds: named },
                );
            }
        }
        let tick = await this.start(runInput, run);
        while (tick.kind === RunKind.RUNNING) {
            if (this.now().getTime() > deadline) {
                const stopped = await this.stop(runInput, tick.state, run);
                if (stopped.kind === RunKind.COMPLETED) return stopped;
                throw new EngineError(
                    EngineErrorCode.TIMEOUT,
                    `${this.doc.id} exceeded runMs ${this.doc.timeouts.runMs}` +
                        ` (stop: ${stopped.kind})`,
                );
            }
            // cap the nap by the remaining budget: a fn requesting a long
            // pollAfterMs must not delay TIMEOUT + best-effort stop past
            // runMs (the loop re-checks the deadline before the next poll)
            const remaining = deadline - this.now().getTime();
            await doSleep(
                Math.min(tick.pollAfterMs, Math.max(remaining, 0)),
                opts?.signal,
            );
            tick = await this.poll(runInput, tick.state, run);
        }
        return tick;
    }

    // ---- shared pipeline pieces ----

    /** validate the input trio (INVALID_INPUT) then input.toRequest —
     *  IDENTICAL for start and every poll/stop tick (deterministic). */
    private deriveInput(runInput: RunInput): RunInput {
        let input = validateInput(this.doc, runInput);
        if (this.fns.toRequest) input = this.fns.toRequest({ input });
        return input;
    }

    /** The run identity into ctx.data.run — the host's handle, or a
     *  minted UUID (valid but not retry-stable; hosts that need stable
     *  vendor idempotency keys pass their own). */
    private runInfo(run: RunHandle | undefined): { runId: string } {
        return { runId: run?.runId ?? crypto.randomUUID() };
    }

    /** MID-RUN accrued cost (design D40) — the ESTIMATE, re-run with
     *  `elapsedMs` set ("the price is an estimation, and it syncs once
     *  in a while"). Docs without `usage.updateEstimateEveryMs` return
     *  the static estimate (a flat promise IS its own curve). */
    accrued(runInput: RunInput, elapsedMs: number): Usage {
        if (this.doc.usage.updateEstimateEveryMs === undefined) {
            return this.estimate(runInput);
        }
        return this.estimate(runInput, Math.max(0, elapsedMs));
    }

    /** The compiled request as DATA into lifecycle fns ({pathParam}s
     *  substituted, static headers included). */
    private requestInfo(input: RunInput): LifecycleRequestInfo {
        return {
            method: this.doc.request.method,
            url: substituteUrl(this.doc, input),
            ...(this.doc.request.headers
                ? { headers: this.doc.request.headers }
                : {}),
        };
    }

    /** The engine's clock — injectable via EngineCtx.now (testability). */
    private now(): Date {
        return (this.ctx.now ?? (() => new Date()))();
    }

    /** Re-validate a host-threaded state on the way in: zRunState + the
     *  doc's stateSchema. A corrupt payload is the CALLER's fault, not a
     *  fn contract breach → INVALID_INPUT. */
    private parseThreadedState(state: RunState): RunState {
        const parsed = zRunState.safeParse(state);
        if (!parsed.success) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${this.doc.id}: threaded run state invalid: ${
                    formatZodError(parsed.error)
                }`,
            );
        }
        const schema = this.doc.lifecycle?.stateSchema;
        if (schema && parsed.data.data !== undefined) {
            const check = validateAgainst(schema, parsed.data.data);
            if (!check.ok) {
                throw new EngineError(
                    EngineErrorCode.INVALID_INPUT,
                    `${this.doc.id}: threaded state.data ${check.message}`,
                );
            }
        }
        return parsed.data;
    }

    /** WHOLE-STATE semantics (design D21): a PRESENT outcome.state IS the
     *  complete next fn-state (replaces the previous one wholesale); an
     *  ABSENT one carries the previous fn-owned fields forward untouched.
     *  No field-level merge exists — the null-vs-undefined patch
     *  ambiguity ("does data: null clear or inherit?") is structurally
     *  gone (PR #2 finding). Engine-owned timing is attached separately. */
    private nextFnState(
        outcomeState: FnState | undefined,
        prev: RunState | undefined,
    ): FnState {
        if (outcomeState !== undefined) return outcomeState;
        return {
            ...(prev?.externalRunId !== undefined
                ? { externalRunId: prev.externalRunId }
                : {}),
            ...(prev?.stage !== undefined ? { stage: prev.stage } : {}),
            ...(prev?.data !== undefined ? { data: prev.data } : {}),
        };
    }

    /** ENGINE-owned timing advance — fns cannot tamper (fn-states have
     *  no timing field). First tick initializes;
     *  every poll tick stamps lastPolledAt and accumulates. */
    private advanceTiming(
        prev: RunTimingInFlight | undefined,
        t0: Date,
        tickMs: number,
    ): RunTimingInFlight {
        if (!prev) {
            return {
                startedAt: t0.toISOString(),
                startRequestMs: tickMs,
                attempts: 0,
                pollMsTotal: 0,
                deadlineAt: new Date(t0.getTime() + this.doc.timeouts.runMs)
                    .toISOString(),
            };
        }
        return {
            ...prev,
            lastPolledAt: t0.toISOString(),
            attempts: prev.attempts + 1,
            pollMsTotal: prev.pollMsTotal + tickMs,
        };
    }

    /** Map a lifecycle outcome to a run result (running gates + settle).
     *  `t0` is when THIS tick began — its duration is measured here. */
    private fromOutcome(
        outcome: LifecycleOutcome,
        input: RunInput,
        prevState: RunState | undefined,
        t0: Date,
        targets: GatedTarget[] = [],
    ): RunStartResult {
        const completedAt = this.now();
        const tickMs = Math.max(0, completedAt.getTime() - t0.getTime());
        const fnFields = this.nextFnState(outcome.state, prevState);
        const timing = this.advanceTiming(prevState?.timing, t0, tickMs);

        if (outcome.kind === RunKind.RUNNING) {
            if (!this.fns.lifecyclePoll) {
                throw new EngineError(
                    EngineErrorCode.CONTRACT_VIOLATION,
                    `${this.doc.id}: lifecycle returned RUNNING but the doc has no lifecycle.poll`,
                );
            }
            const state: RunState = { ...fnFields, timing };
            this.assertState(state);
            const pollAfterMs = outcome.pollAfterMs ??
                this.doc.timeouts.pollMs;
            if (pollAfterMs === undefined) {
                throw new EngineError(
                    EngineErrorCode.BAD_DOC,
                    `${this.doc.id}: pollable doc carries no timeouts.pollMs`,
                );
            }
            return { kind: RunKind.RUNNING, state, pollAfterMs };
        }

        // COMPLETED — the merged final state rides into the settle envelope
        // (billing signals stashed during polling stay readable); absent
        // entirely when nothing was ever stashed (sync-in-one-tick).
        const hasState = outcome.state !== undefined ||
            prevState !== undefined;
        const finalState: RunState | undefined = hasState
            ? { ...fnFields, timing }
            : undefined;
        if (finalState !== undefined) this.assertState(finalState);
        const startedAtMs = Date.parse(timing.startedAt);
        return this.settle(
            input,
            outcome.httpStatus,
            outcome.output,
            finalState,
            outcome.providerHttpStatus,
            targets,
            {
                startedAt: timing.startedAt,
                completedAt: completedAt.toISOString(),
                attempts: timing.attempts,
                startRequestMs: timing.startRequestMs,
                pollMsTotal: timing.pollMsTotal,
                providerTotalMs: Math.max(
                    0,
                    completedAt.getTime() - startedAtMs,
                ),
            },
        );
    }

    /**
     * THE settle pipeline — identical for both execution modes:
     * usage.consolidate on the RAW envelope (billing truth anchors to the
     * wire; the final threaded `state` rides along so async billing signals
     * stashed during polling are readable) → output.fromResponse → final
     * output.schema. Vendor error (non-2xx httpStatus — fn-synthesized for
     * in-body failures) ⇒ zero usage FORCED; no hook runs, so a lifecycle fn
     * can never bill an error.
     */
    private settle(
        input: RunInput,
        httpStatus: number,
        raw: Json,
        state: RunState | undefined,
        providerHttpStatus: number | undefined,
        targets: GatedTarget[],
        timing: RunTiming,
    ): RunCompleted {
        const doc = this.doc;
        const isProviderError = !(httpStatus >= 200 && httpStatus < 300);
        let usage = zeroUsage();
        let output = raw;
        if (isProviderError && this.fns.fromError) {
            // presentation-only error projection — runs AFTER zero-usage
            // forcing (a projection can never touch a bill); output.schema
            // never applies to error shapes
            output = this.fns.fromError({
                input,
                output: raw,
                ...(state !== undefined ? { lifecycle: { state } } : {}),
                usage: { model: doc.usage.model },
            });
        }
        if (!isProviderError) {
            const envelope: EnvelopeData = {
                input,
                output: raw,
                ...(state !== undefined ? { lifecycle: { state } } : {}),
                // the doc's OWN model rides along (at its provenance path
                // data.usage.model) so a GENERIC provider consolidate can
                // key its counts (design D19)
                usage: { model: doc.usage.model },
            };
            // QUANTITIES first (usage.evidence — metered line keys only),
            // then the D26 assembly: flat 1s appended, folded through the
            // doc's own rate card → {credits, evidence}. Error settles
            // keep zeroUsage() — nothing billed, nothing evidenced.
            const settled = this.fns.usageEvidence(envelope);
            this.validateUsage(settled);
            usage = assembleUsage(doc.usage.model, settled.counts);
            // THE VENDOR'S OWN METER (usage.consolidate — design D27):
            // a non-empty claim WINS (source of truth; zero entries mean
            // "nothing consumed" and are pruned — an all-empty claim
            // falls back to our derived fold). On disagreement the fold
            // rides out as usage.mismatch.derived — said, never hidden,
            // never failing the run. The claim's pool ids must be
            // DECLARED credit systems (fail-closed: a nonzero claim on a
            // FREE doc trips this loudly).
            if (this.fns.usageConsolidate) {
                const consolidated = this.fns.usageConsolidate(envelope);
                const claim = pruneZeroCredits(consolidated.credits);
                for (const pool of Object.keys(claim)) {
                    if (!(pool in doc.usage.credits)) {
                        throw new EngineError(
                            EngineErrorCode.FN_CONTRACT,
                            `${doc.id}: consolidate claimed undeclared ` +
                                `credit pool "${pool}" (declared: ` +
                                `${
                                    Object.keys(doc.usage.credits)
                                        .join(", ") || "none"
                                })`,
                        );
                    }
                }
                if (Object.keys(claim).length > 0) {
                    const derived = usage.credits;
                    usage = {
                        credits: claim,
                        evidence: usage.evidence,
                        ...(creditsDisagree(claim, derived)
                            ? { mismatch: { derived } }
                            : {}),
                    };
                    if (usage.mismatch) {
                        this.logger.warn("usage mismatch", {
                            endpoint: doc.id,
                            reported: claim,
                            derived,
                        });
                    }
                }
                output = consolidated.output ?? raw;
            } else {
                output = raw;
            }
            if (this.fns.fromResponse) {
                output = this.fns.fromResponse({
                    input,
                    output,
                    ...(state !== undefined ? { lifecycle: { state } } : {}),
                    usage: { model: doc.usage.model },
                });
            }
            if (doc.output.schema) {
                const check = validateAgainst(doc.output.schema, output);
                if (!check.ok) {
                    throw new EngineError(
                        EngineErrorCode.CONTRACT_VIOLATION,
                        `${doc.id}: output ${check.message}`,
                    );
                }
            }
        }
        // D32 settle marks — SUCCESS only (a failed run neither
        // provisions nor releases); derived from the binding's
        // interaction, the host's persistence work-order. The seed fn
        // reads the RAW envelope (like evidence — provision anchors to
        // the wire): the user-facing fromResponse projection strips
        // exactly the internals a provision needs (vendor ids, quoted
        // prices).
        const resources = isProviderError
            ? undefined
            : this.deriveEffects(input, raw, state, targets);
        // flat, kind-discriminated (no nested result to unwrap)
        return {
            kind: RunKind.COMPLETED,
            httpStatus,
            ...(providerHttpStatus !== undefined &&
                    providerHttpStatus !== httpStatus
                ? { providerHttpStatus }
                : {}),
            output,
            usage,
            isProviderError,
            timing,
            ...(resources !== undefined ? { resources } : {}),
        };
    }

    /** The bindings' settle-side derivation (design D32/D43): the
     *  provisions binding runs its seed fn on the RAW envelope; every
     *  keyed uses/updates/releases target lands in its purpose's mark
     *  bucket. reads marks nothing. */
    private deriveEffects(
        input: RunInput,
        output: Json,
        state: RunState | undefined,
        targets: GatedTarget[],
    ): ResourceEffects | undefined {
        if (!this.doc.resources) return undefined;
        const effects: ResourceEffects = {};
        if (this.fns.seed) {
            const seed = this.fns.seed({
                input,
                output,
                ...(state !== undefined
                    ? {
                        state: {
                            ...(state.externalRunId !== undefined
                                ? { externalRunId: state.externalRunId }
                                : {}),
                            ...(state.stage !== undefined
                                ? { stage: state.stage }
                                : {}),
                            ...(state.data !== undefined
                                ? { data: state.data }
                                : {}),
                        },
                    }
                    : {}),
            });
            if (seed !== null) effects.provisions = [seed];
        }
        const bucketOf = {
            uses: "reconciles",
            updates: "refreshes",
            releases: "releases",
        } as const;
        for (const { purpose, target } of targets) {
            if (purpose === "reads") continue;
            const bucket = bucketOf[purpose as keyof typeof bucketOf];
            (effects[bucket] ??= []).push(target);
        }
        return Object.keys(effects).length > 0 ? effects : undefined;
    }

    /** Counts ↔ model discipline (design D19), fail-closed (FN_CONTRACT —
     *  a doc fn wrote the counts; the type + loader gates already forced
     *  correct authorship, so this is the LIVE-DATA residue). The RULES
     *  live beside the schema they interpret — shared/core's exhaustive
     *  `countsMismatch` switch (also used by test card-invariant helpers
     *  and, later, the services broker); the engine owns only the error
     *  type. Applied to consolidate output at settle AND to the estimate
     *  fn's return — `{counts: {}}` passes everywhere. */
    private validateUsage(usage: FnUsage): void {
        const problem = countsMismatch(this.doc.usage.model, usage.counts);
        if (problem !== undefined) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${this.doc.id}: ${problem}`,
            );
        }
    }

    /** State discipline, fail-closed (FN_CONTRACT — the fn wrote it):
     *  the structural contract (zRunState — externalRunId non-empty when
     *  present, engine-owned timing shape), the TYPED-state check (the
     *  doc's lifecycle.stateSchema over the fn-owned `data` bag, when
     *  declared), and the HARD size cap (config schema.state_max_bytes —
     *  state travels BY VALUE every tick, ids + billing signals, never
     *  payloads). */
    private assertState(state: RunState): void {
        const parsed = zRunState.safeParse(state);
        if (!parsed.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${this.doc.id}: lifecycle state invalid: ${
                    formatZodError(parsed.error)
                }`,
            );
        }
        const schema = this.doc.lifecycle?.stateSchema;
        if (schema && state.data !== undefined) {
            const check = validateAgainst(schema, state.data);
            if (!check.ok) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${this.doc.id}: lifecycle state.data ${check.message}`,
                );
            }
        }
        const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
        const max = contractConfig.schema.stateMaxBytes;
        if (bytes > max) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${this.doc.id}: lifecycle state is ${bytes} bytes (max ${max}) — ` +
                    `state carries ids + billing signals, never payloads`,
            );
        }
    }
}

/**
 * A loaded RESOURCE doc — the host-driven op surface (design D30/D31/D33).
 * The host owns WHEN (schedules, holds, boundary settles); these methods
 * own HOW. Every op takes the OWNED INSTANCE, validated on the way in
 * (identity + the doc's data schema — defense against host drift →
 * INVALID_INPUT, the caller wrote it).
 */
export class LoadedResource implements RunnableResource {
    constructor(
        readonly doc: ResourceDoc,
        private readonly injectEntry: Parameters<typeof buildRequest>[2],
        private readonly fns: LinkedResourceFns,
        private readonly ctx: EngineCtx,
        private readonly logger: Logger,
    ) {}

    // deno-lint-ignore require-await
    async verify(resource: OwnedResource): Promise<VerifyOutcome> {
        const valid = this.parseResource(resource);
        return this.fns.verify({ resource: valid }, this.utils());
    }

    // deno-lint-ignore require-await
    async release(resource: OwnedResource): Promise<ReleaseOutcome> {
        const valid = this.parseResource(resource);
        return this.fns.release({ resource: valid }, this.utils());
    }

    async refresh(resource: OwnedResource): Promise<RefreshOutcome> {
        if (!this.fns.refresh) {
            throw new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} declares no lifecycle.refresh`,
            );
        }
        const valid = this.parseResource(resource);
        const outcome = await this.fns.refresh(
            { resource: valid },
            this.utils(),
        );
        // the patch is the next stored snapshot — it must satisfy the
        // doc's own data schema (FN_CONTRACT: the fn wrote it)
        if (outcome.patch !== undefined) {
            const check = validateAgainst(
                this.doc.data.schema,
                outcome.patch,
            );
            if (!check.ok) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${this.doc.id}: refresh patch ${check.message}`,
                );
            }
        }
        return outcome;
    }

    // deno-lint-ignore require-await
    async reconcileUsage(
        line: string,
        resource: OwnedResource,
        window: UsageWindow,
    ): Promise<UsageReading> {
        const get = this.fns.reconcile[line];
        if (!get) {
            throw new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} declares no reconcileUsage for line ` +
                    `"${line}" (declared: ${
                        Object.keys(this.fns.reconcile).join(", ") || "none"
                    })`,
            );
        }
        const valid = this.parseResource(resource);
        return get({ resource: valid, window }, this.utils());
    }

    // deno-lint-ignore require-await
    async view(
        kind: string,
        resource: OwnedResource,
        args?: Json,
    ): Promise<Json> {
        const read = this.fns.views[kind];
        if (!read) {
            throw new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} declares no view "${kind}" (declared: ${
                    Object.keys(this.fns.views).join(", ") || "none"
                })`,
            );
        }
        const valid = this.parseResource(resource);
        return read(
            {
                resource: valid,
                ...(args !== undefined ? { args } : {}),
            },
            this.utils(),
        );
    }

    /** Instance discipline: structural shape + identity match + the
     *  doc's own data schema — a corrupt instance is the CALLER's
     *  fault. */
    private parseResource(resource: OwnedResource): OwnedResource {
        const parsed = zOwnedResource.safeParse(resource);
        if (!parsed.success) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${this.doc.id}: owned resource invalid: ${
                    formatZodError(parsed.error)
                }`,
            );
        }
        if (parsed.data.resource !== this.doc.id) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${this.doc.id}: instance belongs to ${parsed.data.resource}`,
            );
        }
        const check = validateAgainst(this.doc.data.schema, parsed.data.data);
        if (!check.ok) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${this.doc.id}: resource data ${check.message}`,
            );
        }
        return parsed.data;
    }

    private utils() {
        return makeResourceOpUtils({
            doc: this.doc,
            auth: {
                inject: {
                    ref: this.doc.auth.inject,
                    entry: this.injectEntry,
                },
                credentials: this.doc.auth.credentials,
            },
            transport: this.ctx.transport,
            sleep: (ms) => (this.ctx.sleep ?? sleep)(ms),
        });
    }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason);
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal?.reason);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}
