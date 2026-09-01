import { greaterThan, parse as parseSemver } from "@std/semver";
import {
    type EndpointDoc,
    type EnvelopeData,
    formatZodError,
    type Json,
    type RunCompleted,
    type RunInput,
    type RunResult,
    zeroUsage,
    zSealedUnit,
} from "@shared/core";
import type { Logger } from "@shared/logging";
import denoJson from "./deno.json" with { type: "json" };
import type {
    ConnectorEngine,
    EngineCtx,
    RunnableEndpoint,
    TransportResponse,
} from "./interfaces/mod.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";
import { type LinkedFns, linkFns } from "./link.ts";
import { buildRequest, validateInput } from "./request.ts";
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
        const linked = await linkFns(doc, fns, ENGINE_VERSION);
        this.logger.debug("loaded endpoint", { id: doc.id });
        return new LoadedEndpoint(
            doc,
            fns[doc.auth.inject.$fn.key],
            linked,
            this.ctx,
        );
    }
}

export class LoadedEndpoint implements RunnableEndpoint {
    constructor(
        readonly doc: EndpointDoc,
        private readonly injectEntry: Parameters<typeof buildRequest>[2],
        private readonly fns: LinkedFns,
        private readonly ctx: EngineCtx,
    ) {}

    // ---- Temporal-activity-shaped: stateless, strict-JSON in/out, no sleeps ----

    async start(runInput: RunInput): Promise<RunResult> {
        const doc = this.doc;
        // 1. validate the input trio                                → INVALID_INPUT
        let input = validateInput(doc, runInput);
        // 2. input.toRequest (leaf-wise resolved at compile: endpoint ?? provider)
        if (this.fns.toRequest) input = this.fns.toRequest({ input });
        // 3. build request — auth travels UNEXECUTED (credentials stay out of the pipeline)
        const request = buildRequest(doc, input, this.injectEntry);
        // 4. transport: injection + egress inside the port          → EXECUTION_FAILED (retriable)
        const response = await this.ctx.transport.execute(request);
        // 5. sniffing decode: JSON if it parses, else the faithful raw string
        const decoded = decode(response);
        const isProviderError =
            !(response.status >= 200 && response.status < 300);
        // 6. usage.consolidate — THE settle fn, on the RAW envelope: extracts
        //    the structured usage AND absorbs the billing fields out of the
        //    payload in one move (output absent = unchanged). Runs BEFORE
        //    fromResponse: billing truth anchors to the wire response, so a
        //    presentation change can never silently change a bill. Vendor
        //    error ⇒ zero usage forced (the hook never runs).
        const envelope: EnvelopeData = { input, output: decoded };
        let usage = zeroUsage();
        let output = decoded;
        if (!isProviderError) {
            const settled = this.fns.usageConsolidate(envelope);
            usage = settled.usage;
            output = settled.output ?? decoded;
            // 7. output.fromResponse (consolidated output in — domain data only)
            if (this.fns.fromResponse) {
                output = this.fns.fromResponse({ input, output });
            }
            // 8. final output contract (post-fromResponse)          → CONTRACT_VIOLATION
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
            httpStatus: response.status,
            output,
            usage,
            isProviderError,
        };
    }

    poll(_state: Json): Promise<RunResult> {
        return Promise.reject(
            new EngineError(
                EngineErrorCode.NOT_ASYNC,
                `${this.doc.id} is a sync endpoint`,
            ),
        );
    }

    stop(_state: Json): Promise<void> {
        return Promise.resolve();
    }

    // ---- OSS orchestrator: the ONLY place that sleeps. Never used under Temporal
    // (the hosted workflow re-implements this loop with workflow.sleep). ----

    async run(
        runInput: RunInput,
        opts?: { signal?: AbortSignal },
    ): Promise<RunCompleted> {
        const deadline = Date.now() + this.doc.timeouts.runMs;
        let tick = await this.start(runInput);
        while (tick.kind === "running") {
            if (Date.now() > deadline) {
                await this.stop(tick.state);
                throw new EngineError(
                    EngineErrorCode.TIMEOUT,
                    `${this.doc.id} exceeded runMs ${this.doc.timeouts.runMs}`,
                );
            }
            await sleep(tick.pollAfterMs, opts?.signal);
            tick = await this.poll(tick.state);
        }
        return tick;
    }
}

/**
 * Sniffing decode — no per-endpoint flag needed: fromResponse guarantees the
 * FINAL shape, so the intermediate just needs one universal rule. Bodies are
 * passed through faithfully (no truncation, no error-wrapping — vendor error
 * pages are already flagged by the HTTP status via isProviderError).
 */
function decode(response: TransportResponse): Json {
    const text = response.body;
    if (text.trim() === "") return null;
    try {
        return JSON.parse(text) as Json;
    } catch {
        return text;
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
