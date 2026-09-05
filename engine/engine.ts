import { greaterThan, parse as parseSemver } from "@std/semver";
import {
    contractConfig,
    type EndpointDoc,
    type EnvelopeData,
    formatZodError,
    type HookLogger,
    type Json,
    type LifecycleOutcome,
    type LifecycleRequestInfo,
    type LifecycleUtils,
    type RunCompleted,
    type RunInput,
    type RunPollResult,
    type RunStartResult,
    zeroUsage,
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

    async start(runInput: RunInput): Promise<RunStartResult> {
        const doc = this.doc;
        const input = this.deriveInput(runInput);

        // LIFECYCLE mode: the start fn replaces the declarative execution —
        // the compiled request rides in as DATA (ctx.data.request).
        if (this.fns.lifecycleStart) {
            const request = this.requestInfo(input);
            const outcome = await this.fns.lifecycleStart(
                { input, request },
                this.utilsFor(input, request),
            );
            return this.fromOutcome(outcome, input, undefined);
        }

        // DECLARATIVE mode (sync): one request, engine-executed.
        // 1. build request — auth travels UNEXECUTED (credentials stay out of the pipeline)
        const request = buildRequest(doc, input, this.injectEntry);
        // 2. transport: injection + egress inside the port  → EXECUTION_FAILED (retriable)
        const response = await this.ctx.transport.execute(request);
        // 3. sniffing decode: JSON if it parses, else the faithful raw string
        return this.settle(input, response.status, sniffDecode(response));
    }

    /**
     * One poll tick. The caller's input is RE-DERIVED deterministically
     * (validate + input.toRequest) so lifecycle fns see the same input as
     * start — under Temporal each tick is a separate activity holding the
     * payload by value anyway.
     */
    async poll(runInput: RunInput, state: Json): Promise<RunPollResult> {
        if (!this.fns.lifecyclePoll) {
            throw new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} has no lifecycle.poll — not a pollable endpoint`,
            );
        }
        const input = this.deriveInput(runInput);
        const request = this.requestInfo(input);
        const outcome = await this.fns.lifecyclePoll(
            { input, request, state },
            this.utilsFor(input, request),
        );
        return this.fromOutcome(outcome, input, state);
    }

    /** Best-effort, idempotent teardown: no lifecycle.stop ⇒ no-op; with one,
     *  EVERY failure is swallowed (cleanup never masks the run outcome). */
    async stop(runInput: RunInput, state: Json): Promise<void> {
        if (!this.fns.lifecycleStop) return;
        try {
            const input = this.deriveInput(runInput);
            const request = this.requestInfo(input);
            await this.fns.lifecycleStop(
                { input, request, state },
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
        const now = this.ctx.now ?? (() => new Date());
        const deadline = now().getTime() + this.doc.timeouts.runMs;
        let tick = await this.start(runInput);
        while (tick.kind === "running") {
            if (now().getTime() > deadline) {
                await this.stop(runInput, tick.state);
                throw new EngineError(
                    EngineErrorCode.TIMEOUT,
                    `${this.doc.id} exceeded runMs ${this.doc.timeouts.runMs}`,
                );
            }
            await doSleep(tick.pollAfterMs, opts?.signal);
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

    /** Map a lifecycle outcome to a run result (running gates + settle). */
    private fromOutcome(
        outcome: LifecycleOutcome,
        input: RunInput,
        prevState: Json | undefined,
    ): RunStartResult {
        if (outcome.kind === "running") {
            if (!this.fns.lifecyclePoll) {
                throw new EngineError(
                    EngineErrorCode.CONTRACT_VIOLATION,
                    `${this.doc.id}: lifecycle returned "running" but the doc has no lifecycle.poll`,
                );
            }
            this.assertState(outcome.state);
            const pollAfterMs = outcome.pollAfterMs ??
                this.doc.timeouts.pollMs;
            if (pollAfterMs === undefined) {
                throw new EngineError(
                    EngineErrorCode.BAD_DOC,
                    `${this.doc.id}: pollable doc carries no timeouts.pollMs`,
                );
            }
            return { kind: "running", state: outcome.state, pollAfterMs };
        }
        if (outcome.state !== undefined) this.assertState(outcome.state);
        return this.settle(
            input,
            outcome.httpStatus,
            outcome.output,
            outcome.state ?? prevState,
            outcome.providerHttpStatus,
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
        state?: Json,
        providerHttpStatus?: number,
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
                ...(state !== undefined ? { state } : {}),
            });
        }
        if (!isProviderError) {
            const envelope: EnvelopeData = {
                input,
                output: raw,
                ...(state !== undefined ? { state } : {}),
            };
            const settled = this.fns.usageConsolidate(envelope);
            usage = settled.usage;
            output = settled.output ?? raw;
            if (this.fns.fromResponse) {
                output = this.fns.fromResponse({
                    input,
                    output,
                    ...(state !== undefined ? { state } : {}),
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
            kind: "completed",
            httpStatus,
            ...(providerHttpStatus !== undefined &&
                    providerHttpStatus !== httpStatus
                ? { providerHttpStatus }
                : {}),
            output,
            usage,
            isProviderError,
        };
    }

    /** State discipline, fail-closed: the HARD size cap (config
     *  schema.state_max_bytes — state travels BY VALUE every tick, ids +
     *  billing signals, never payloads) and the ONE reserved key —
     *  `state.externalRunId` (the vendor's run id, THE correlation handle
     *  hosts read) must be a non-empty string when present. */
    private assertState(state: Json): void {
        const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
        const max = contractConfig.schema.stateMaxBytes;
        if (bytes > max) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${this.doc.id}: lifecycle state is ${bytes} bytes (max ${max}) — ` +
                    `state carries ids + billing signals, never payloads`,
            );
        }
        if (
            state !== null && typeof state === "object" &&
            !Array.isArray(state) && "externalRunId" in state
        ) {
            const id = (state as Record<string, Json>).externalRunId;
            if (typeof id !== "string" || id === "") {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${this.doc.id}: state.externalRunId is reserved for the ` +
                        `vendor's run id and must be a non-empty string`,
                );
            }
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
