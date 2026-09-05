import { greaterThan, parse as parseSemver } from "@std/semver";
import { z } from "zod";
import {
    type AuthData,
    AuthInjectContract,
    type AuthInjectFn,
    type Consolidated,
    type EndpointDoc,
    type EnvelopeData,
    type FnEntry,
    FnEntryKind,
    fnKey,
    type FnRef,
    formatZodError,
    type HookLogger,
    type HttpRequestParts,
    InputToRequestContract,
    type InputToRequestFn,
    type Json,
    type LifecycleOutcome,
    type LifecycleStartData,
    type LifecycleTickData,
    type LifecycleUtils,
    OutputFromErrorContract,
    type OutputFromErrorFn,
    OutputFromResponseContract,
    type OutputFromResponseFn,
    type RunInput,
    type ToRequestData,
    UsageConsolidateContract,
    type UsageConsolidateFn,
    zLifecycleOutcome,
    zLifecycleStartData,
    zLifecycleTickData,
} from "@shared/core";
import { EngineError, EngineErrorCode } from "./errors.ts";
import { fnUtils } from "./fn-utils.ts";

/**
 * Linked hook fns — each wrapped with its hook's contract
 * (`Contract.implement()`), so the ctx argument AND the return are
 * zod-validated on EVERY call (the same z.function factories that type the
 * defs — drift impossible). Violations and throws → FN_CONTRACT, fail-closed.
 * `utils` is injected by the wrapper; callers pass data only.
 *
 * link.ts lives in the ENGINE deliberately: every gate here (UNKNOWN_FN,
 * LINK_INTEGRITY, UNSUPPORTED_FN_ABI, FN_CONTRACT) is an engine load-time
 * guarantee tied to ENGINE_VERSION, and instantiation calls `new Function` —
 * an execution capability the contract package must never have.
 */
export interface LinkedFns {
    authInject: (data: AuthData) => HttpRequestParts;
    toRequest?: (data: ToRequestData) => RunInput;
    fromResponse?: (data: EnvelopeData) => Json;
    /** Provider-error projection — runs only on error envelopes. */
    fromError?: (data: EnvelopeData) => Json;
    /** THE settle fn: raw envelope → {usage, output?}. */
    usageConsolidate: (data: EnvelopeData) => Consolidated;
    /** Lifecycle (async) family — effectful, so `utils` (http/request bound
     *  to THIS invocation's input + request) is passed per call. */
    lifecycleStart?: (
        data: LifecycleStartData,
        utils: LifecycleUtils,
    ) => Promise<LifecycleOutcome>;
    lifecyclePoll?: (
        data: LifecycleTickData,
        utils: LifecycleUtils,
    ) => Promise<LifecycleOutcome>;
    lifecycleStop?: (
        data: LifecycleTickData,
        utils: LifecycleUtils,
    ) => Promise<void>;
}

/** Instantiate a verified entry in an empty scope; factories get their args applied. */
export function instantiate(
    entry: FnEntry,
    ref: FnRef,
    label: string,
): unknown {
    let value: unknown;
    try {
        value = new Function(`"use strict"; return (${entry.src});`)();
    } catch (error) {
        throw new EngineError(
            EngineErrorCode.LINK_INTEGRITY,
            `${label}: fn source does not evaluate: ${error}`,
        );
    }
    if (typeof value !== "function") {
        throw new EngineError(
            EngineErrorCode.LINK_INTEGRITY,
            `${label}: source is not a function`,
        );
    }
    if (entry.kind === FnEntryKind.FACTORY) {
        const applied = (value as (...args: Json[]) => unknown)(
            ...(ref.$fn.args ?? []),
        );
        if (typeof applied !== "function") {
            throw new EngineError(
                EngineErrorCode.LINK_INTEGRITY,
                `${label}: factory did not return a function`,
            );
        }
        return applied;
    }
    return value;
}

/** Resolve one $fn ref against the sealed unit's entries — all gates fail closed. */
export async function resolveFn(
    ref: FnRef,
    fns: Record<string, FnEntry>,
    engineVersion: string,
    label: string,
): Promise<unknown> {
    const key = ref.$fn.key;
    const entry = fns[key];
    if (!entry) {
        throw new EngineError(
            EngineErrorCode.UNKNOWN_FN,
            `${label}: no fn entry for ${key}`,
        );
    }
    const actual = await fnKey(entry.src);
    if (actual !== key) {
        throw new EngineError(
            EngineErrorCode.LINK_INTEGRITY,
            `${label}: entry src hashes to ${actual}, doc references ${key}`,
        );
    }
    if (greaterThan(parseSemver(entry.api), parseSemver(engineVersion))) {
        throw new EngineError(
            EngineErrorCode.UNSUPPORTED_FN_ABI,
            `${label}: fn targets ABI ${entry.api}, this engine is ${engineVersion}`,
        );
    }
    return instantiate(entry, ref, label);
}

/** Contract shape shared by the z.function factories we wrap. */
interface ContractLike<F> {
    implement(fn: F): F;
}

/**
 * Wrap a raw linked fn with its hook contract: `Contract.implement` validates
 * the ctx argument and the return per call (ZodError); any violation or
 * throw becomes FN_CONTRACT. `utils` and `logger` are injected by the
 * wrapper; callers pass data only.
 */
function wrapContract<
    D,
    R,
    F extends (
        ctx: { data: D; utils: typeof fnUtils; logger: HookLogger },
    ) => R,
>(
    contract: ContractLike<F>,
    raw: unknown,
    label: string,
    hookName: string,
    logger: HookLogger,
): (data: D) => R {
    const impl = contract.implement(raw as F);
    return (data: D): R => {
        try {
            return impl({ data, utils: fnUtils, logger } as Parameters<F>[0]);
        } catch (error) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: ${hookName} broke its contract: ${error}`,
                { cause: error },
            );
        }
    };
}

/**
 * Wrap a linked LIFECYCLE fn. Enforcement differs from wrapContract because
 * the fn is ASYNC and EFFECTFUL:
 *   - ctx.data validated before the call, the awaited OUTCOME after —
 *     violations are FN_CONTRACT, fail-closed.
 *   - EngineErrors thrown inside the fn (utils.http transport failures →
 *     EXECUTION_FAILED, malformed http calls → FN_CONTRACT) propagate
 *     UNTOUCHED — their taxonomy is already correct.
 *   - Any other uncaught throw → EXECUTION_FAILED (retriable) — the
 *     monid-services ProviderError posture: an unhandled failure inside a
 *     lifecycle fn is an execution failure, not a contract breach.
 */
function wrapLifecycle<D>(
    dataSchema: z.ZodType<D>,
    raw: unknown,
    label: string,
    hookName: string,
    logger: HookLogger,
): (data: D, utils: LifecycleUtils) => Promise<LifecycleOutcome> {
    return async (data, utils) => {
        const checked = dataSchema.safeParse(data);
        if (!checked.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: ${hookName} ctx.data invalid: ${
                    formatZodError(checked.error)
                }`,
            );
        }
        let result: unknown;
        try {
            result = await (raw as (
                ctx: {
                    data: D;
                    utils: LifecycleUtils;
                    logger: HookLogger;
                },
            ) => unknown)({ data: checked.data, utils, logger });
        } catch (error) {
            if (error instanceof EngineError) throw error;
            throw new EngineError(
                EngineErrorCode.EXECUTION_FAILED,
                `${label}: ${hookName} failed: ${error}`,
                { cause: error },
            );
        }
        const outcome = zLifecycleOutcome.safeParse(result);
        if (!outcome.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: ${hookName} broke its contract: ${
                    formatZodError(outcome.error)
                }`,
            );
        }
        return outcome.data;
    };
}

/** Like wrapLifecycle, but the return is IGNORED (stop is best-effort void —
 *  the engine additionally swallows everything this lets through). */
function wrapLifecycleStop(
    raw: unknown,
    label: string,
    logger: HookLogger,
): (data: LifecycleTickData, utils: LifecycleUtils) => Promise<void> {
    return async (data, utils) => {
        const checked = zLifecycleTickData.safeParse(data);
        if (!checked.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: lifecycle.stop ctx.data invalid: ${
                    formatZodError(checked.error)
                }`,
            );
        }
        await (raw as (
            ctx: {
                data: LifecycleTickData;
                utils: LifecycleUtils;
                logger: HookLogger;
            },
        ) => unknown)({ data: checked.data, utils, logger });
    };
}

const NOOP_HOOK_LOGGER: HookLogger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
};

export async function linkFns(
    doc: EndpointDoc,
    fns: Record<string, FnEntry>,
    engineVersion: string,
    hookLogger: HookLogger = NOOP_HOOK_LOGGER,
): Promise<LinkedFns> {
    const logger = hookLogger;
    const linked: LinkedFns = {
        authInject: wrapContract<AuthData, HttpRequestParts, AuthInjectFn>(
            AuthInjectContract,
            await resolveFn(
                doc.auth.inject,
                fns,
                engineVersion,
                `${doc.id}#auth.inject`,
            ),
            doc.id,
            "auth.inject",
            logger,
        ),
        usageConsolidate: wrapContract<
            EnvelopeData,
            Consolidated,
            UsageConsolidateFn
        >(
            UsageConsolidateContract,
            await resolveFn(
                doc.usage.consolidate,
                fns,
                engineVersion,
                `${doc.id}#usage.consolidate`,
            ),
            doc.id,
            "usage.consolidate",
            logger,
        ),
    };
    if (doc.input.toRequest) {
        linked.toRequest = wrapContract<
            ToRequestData,
            RunInput,
            InputToRequestFn
        >(
            InputToRequestContract,
            await resolveFn(
                doc.input.toRequest,
                fns,
                engineVersion,
                `${doc.id}#input.toRequest`,
            ),
            doc.id,
            "input.toRequest",
            logger,
        );
    }
    if (doc.output.fromResponse) {
        linked.fromResponse = wrapContract<
            EnvelopeData,
            Json,
            OutputFromResponseFn
        >(
            OutputFromResponseContract,
            await resolveFn(
                doc.output.fromResponse,
                fns,
                engineVersion,
                `${doc.id}#output.fromResponse`,
            ),
            doc.id,
            "output.fromResponse",
            logger,
        );
    }
    if (doc.output.fromError) {
        linked.fromError = wrapContract<
            EnvelopeData,
            Json,
            OutputFromErrorFn
        >(
            OutputFromErrorContract,
            await resolveFn(
                doc.output.fromError,
                fns,
                engineVersion,
                `${doc.id}#output.fromError`,
            ),
            doc.id,
            "output.fromError",
            logger,
        );
    }
    if (doc.lifecycle) {
        linked.lifecycleStart = wrapLifecycle(
            zLifecycleStartData,
            await resolveFn(
                doc.lifecycle.start,
                fns,
                engineVersion,
                `${doc.id}#lifecycle.start`,
            ),
            doc.id,
            "lifecycle.start",
            logger,
        );
        if (doc.lifecycle.poll) {
            linked.lifecyclePoll = wrapLifecycle(
                zLifecycleTickData,
                await resolveFn(
                    doc.lifecycle.poll,
                    fns,
                    engineVersion,
                    `${doc.id}#lifecycle.poll`,
                ),
                doc.id,
                "lifecycle.poll",
                logger,
            );
        }
        if (doc.lifecycle.stop) {
            linked.lifecycleStop = wrapLifecycleStop(
                await resolveFn(
                    doc.lifecycle.stop,
                    fns,
                    engineVersion,
                    `${doc.id}#lifecycle.stop`,
                ),
                doc.id,
                logger,
            );
        }
    }
    return linked;
}
