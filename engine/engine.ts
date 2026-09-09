import { greaterThan, parse as parseSemver } from "@std/semver";
import {
    assembleUsage,
    contractConfig,
    countsMismatch,
    type EndpointDoc,
    type EnvelopeData,
    type FnState,
    type FnUsage,
    formatZodError,
    type HookLogger,
    type Json,
    type LifecycleOutcome,
    type LifecycleRequestInfo,
    type LifecycleUtils,
    type RunCompleted,
    type RunInput,
    RunKind,
    type RunPollResult,
    type RunStartResult,
    type RunState,
    type RunTiming,
    type RunTimingInFlight,
    type Usage,
    zeroUsage,
    zRunState,
    zSealedUnit,
} from "@shared/core";
import type { Logger } from "@shared/logging";
import denoJson from "./deno.json" with { type: "json" };
import type {
    ConnectorEngine,
    EngineCtx,
    RunnableEndpoint,
} from "./interfaces/mod.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";
import { type LinkedFns, linkFns } from "./link.ts";
import { makeLifecycleUtils, toHookLogger } from "./fn-utils.ts";
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
     *  substituted request (the v2 provider runtime). */
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
        });
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
    estimate(runInput: RunInput): Usage {
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
                usage: { model },
            });
            // the fn's promise: metered line quantities only
            this.validateUsage(fnUsage);
        }
        return assembleUsage(model, fnUsage.counts);
    }

    async start(runInput: RunInput): Promise<RunStartResult> {
        const doc = this.doc;
        const input = this.deriveInput(runInput);
        const t0 = this.now();

        // LIFECYCLE mode: the start fn replaces the declarative execution —
        // the compiled request rides in as DATA (ctx.data.request).
        if (this.fns.lifecycleStart) {
            const request = this.requestInfo(input);
            const outcome = await this.fns.lifecycleStart(
                { input, request },
                this.utilsFor(input, request),
            );
            return this.fromOutcome(outcome, input, undefined, t0);
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
    async poll(runInput: RunInput, state: RunState): Promise<RunPollResult> {
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
        const outcome = await this.fns.lifecyclePoll(
            { input, request, lifecycle: { state: prevState } },
            this.utilsFor(input, request),
        );
        return this.fromOutcome(outcome, input, prevState, t0);
    }

    /** Best-effort, idempotent teardown: no lifecycle.stop ⇒ no-op; with one,
     *  EVERY failure is swallowed (cleanup never masks the run outcome). */
    async stop(runInput: RunInput, state: RunState): Promise<void> {
        if (!this.fns.lifecycleStop) return;
        try {
            const prevState = this.parseThreadedState(state);
            const input = this.deriveInput(runInput);
            const request = this.requestInfo(input);
            await this.fns.lifecycleStop(
                { input, request, lifecycle: { state: prevState } },
                this.utilsFor(input, request),
            );
        } catch (error) {
            this.logger.warn("lifecycle.stop failed (best-effort, ignored)", {
                id: this.doc.id,
                error: String(error),
            });
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
        let tick = await this.start(runInput);
        while (tick.kind === RunKind.RUNNING) {
            if (this.now().getTime() > deadline) {
                await this.stop(runInput, tick.state);
                throw new EngineError(
                    EngineErrorCode.TIMEOUT,
                    `${this.doc.id} exceeded runMs ${this.doc.timeouts.runMs}`,
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
            tick = await this.poll(runInput, tick.state);
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
            const settled = this.fns.usageConsolidate(envelope);
            // fn-returned QUANTITIES: metered line keys only
            this.validateUsage(settled.usage);
            // D26 assembly: flat 1s appended, folded through the doc's own
            // rate card → {credits, evidence}. Error settles keep
            // zeroUsage() — nothing billed, nothing evidenced.
            usage = assembleUsage(doc.usage.model, settled.usage.counts);
            output = settled.output ?? raw;
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
        };
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
