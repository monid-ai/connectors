import { greaterThan, parse as parseSemver } from "@std/semver";
import { z } from "zod";
import {
    type AuthData,
    AuthInjectContract,
    type AuthInjectFn,
    type Consolidated,
    type EndpointDoc,
    type EnvelopeData,
    type EstimateData,
    type FnEntry,
    FnEntryKind,
    fnKey,
    type FnRef,
    type FnUsage,
    formatZodError,
    type HookLogger,
    type HttpRequestParts,
    InputToRequestContract,
    type InputToRequestFn,
    type Json,
    type LifecycleOutcome,
    type LifecycleStartData,
    type LifecycleStopOutcome,
    type LifecycleTickData,
    type LifecycleUtils,
    OutputFromErrorContract,
    type OutputFromErrorFn,
    OutputFromResponseContract,
    type OutputFromResponseFn,
    type ProvisionSeed,
    ProvisionSeedContract,
    type ProvisionSeedData,
    type ProvisionSeedFn,
    type ResourceDoc,
    type ResourceOpUtils,
    type RunInput,
    type ToRequestData,
    UsageConsolidateContract,
    type UsageConsolidateFn,
    UsageEstimateContract,
    type UsageEstimateFn,
    UsageEvidenceContract,
    type UsageEvidenceFn,
    zEnsureData,
    zJson,
    zLifecycleOutcome,
    zLifecycleStartData,
    zLifecycleStopOutcome,
    zLifecycleTickData,
    zProvisionSeed,
    zReconcileUsageData,
    zRefreshOutcome,
    zReleaseOutcome,
    zResourceOpData,
    zUsageReading,
    zVerifyOutcome,
    zViewData,
} from "@shared/core";
import type {
    EnsureData,
    ReconcileUsageData,
    RefreshOutcome,
    ReleaseOutcome,
    ResourceOpData,
    UsageReading,
    VerifyOutcome,
    ViewData,
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
    /** Post-run quantities settle: raw envelope → {counts} (D27 —
     *  estimate's settle-side twin; the engine folds to credits). */
    usageEvidence: (data: EnvelopeData) => FnUsage;
    /** The vendor-meter fn: raw envelope → {credits, output?} — the
     *  vendor's own claim + its removal from the payload (D27). */
    usageConsolidate?: (data: EnvelopeData) => Consolidated;
    /** Pre-run estimate: validated input → the QUANTITY promise per
     *  metered line (pure, no IO) — the engine folds to credits (D26). */
    usageEstimate?: (data: EstimateData) => FnUsage;
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
    /** Stop with a voice (design D34): a validated outcome, or undefined
     *  for the classic best-effort void posture. */
    lifecycleStop?: (
        data: LifecycleTickData,
        utils: LifecycleUtils,
    ) => Promise<LifecycleStopOutcome | undefined>;
    /** provisions[0] seed (design D32/D43): settled envelope →
     *  provision | null. ONE per doc (provisions ≤1, compile-checked). */
    seed?: (data: ProvisionSeedData) => ProvisionSeed | null;
    /** Pre-run prerequisites (design D32/D43): effectful, full lifecycle
     *  utils; ONE wrapped fn per ensure-carrying binding, in canonical
     *  order (uses then reads, declaration order within). The engine
     *  runs them sequentially and concatenates the seeds. */
    ensures?: Array<
        (
            data: EnsureData,
            utils: LifecycleUtils,
        ) => Promise<ProvisionSeed[]>
    >;
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
 *   - A thrown error carrying `retriable === false` (JsonPathError,
 *     CompileError, other engine-recognized deterministic failures) →
 *     FN_CONTRACT: a deterministic fn bug — retrying cannot succeed, so
 *     the blanket retriable mapping below must not absorb it.
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
            if (
                typeof error === "object" && error !== null &&
                (error as { retriable?: unknown }).retriable === false
            ) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${label}: ${hookName} hit a deterministic fault: ${error}`,
                    { cause: error },
                );
            }
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

/** Like wrapLifecycle, but the return may be VOID (best-effort posture) or
 *  a stop outcome (design D34) — validated when present; the engine
 *  additionally swallows every failure this lets through. */
function wrapLifecycleStop(
    raw: unknown,
    label: string,
    logger: HookLogger,
): (
    data: LifecycleTickData,
    utils: LifecycleUtils,
) => Promise<LifecycleStopOutcome | undefined> {
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
        const result = await (raw as (
            ctx: {
                data: LifecycleTickData;
                utils: LifecycleUtils;
                logger: HookLogger;
            },
        ) => unknown)({ data: checked.data, utils, logger });
        if (result === undefined || result === null) return undefined;
        const outcome = zLifecycleStopOutcome.safeParse(result);
        if (!outcome.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: lifecycle.stop broke its contract: ${
                    formatZodError(outcome.error)
                }`,
            );
        }
        return outcome.data;
    };
}

/**
 * Wrap the CREATES `seed` fn. Every failure — bad data, a throw, an
 * invalid provision record — maps to PROVISION_CONSTRUCT, not
 * FN_CONTRACT: the run already SUCCEEDED upstream; what is at stake is
 * persisting its provision, and hosts alarm that as money-critical.
 */
function wrapSeed(
    raw: unknown,
    label: string,
    logger: HookLogger,
): (data: ProvisionSeedData) => ProvisionSeed | null {
    const impl = ProvisionSeedContract.implement(raw as ProvisionSeedFn);
    return (data) => {
        try {
            return impl({ data, utils: fnUtils, logger });
        } catch (error) {
            throw new EngineError(
                EngineErrorCode.PROVISION_CONSTRUCT,
                `${label}: resource.seed failed to construct a provision: ${error}`,
                { cause: error },
            );
        }
    };
}

/**
 * Wrap the `ensure` fn (effectful, full lifecycle utils). Error posture =
 * wrapLifecycle (EngineErrors untouched, retriable:false → FN_CONTRACT,
 * other throws → EXECUTION_FAILED); an INVALID seed array is
 * PROVISION_CONSTRUCT (records that cannot be persisted).
 */
function wrapEnsure(
    raw: unknown,
    label: string,
    logger: HookLogger,
): (data: EnsureData, utils: LifecycleUtils) => Promise<ProvisionSeed[]> {
    return async (data, utils) => {
        const checked = zEnsureData.safeParse(data);
        if (!checked.success) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: resource.ensure ctx.data invalid: ${
                    formatZodError(checked.error)
                }`,
            );
        }
        let result: unknown;
        try {
            result = await (raw as (
                ctx: {
                    data: EnsureData;
                    utils: LifecycleUtils;
                    logger: HookLogger;
                },
            ) => unknown)({ data: checked.data, utils, logger });
        } catch (error) {
            if (error instanceof EngineError) throw error;
            if (
                typeof error === "object" && error !== null &&
                (error as { retriable?: unknown }).retriable === false
            ) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${label}: resource.ensure hit a deterministic fault: ${error}`,
                    { cause: error },
                );
            }
            throw new EngineError(
                EngineErrorCode.EXECUTION_FAILED,
                `${label}: resource.ensure failed: ${error}`,
                { cause: error },
            );
        }
        const seeds = z.array(zProvisionSeed).safeParse(result);
        if (!seeds.success) {
            throw new EngineError(
                EngineErrorCode.PROVISION_CONSTRUCT,
                `${label}: resource.ensure returned invalid seeds: ${
                    formatZodError(seeds.error)
                }`,
            );
        }
        return seeds.data;
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
        usageEvidence: wrapContract<
            EnvelopeData,
            FnUsage,
            UsageEvidenceFn
        >(
            UsageEvidenceContract,
            await resolveFn(
                doc.usage.evidence,
                fns,
                engineVersion,
                `${doc.id}#usage.evidence`,
            ),
            doc.id,
            "usage.evidence",
            logger,
        ),
    };
    if (doc.usage.consolidate) {
        linked.usageConsolidate = wrapContract<
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
        );
    }
    if (doc.usage.estimate) {
        linked.usageEstimate = wrapContract<
            EstimateData,
            FnUsage,
            UsageEstimateFn
        >(
            UsageEstimateContract,
            await resolveFn(
                doc.usage.estimate,
                fns,
                engineVersion,
                `${doc.id}#usage.estimate`,
            ),
            doc.id,
            "usage.estimate",
            logger,
        );
    }
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
    if (doc.resources) {
        const provision = (doc.resources.provisions ?? [])[0];
        if (provision) {
            linked.seed = wrapSeed(
                await resolveFn(
                    provision.seed,
                    fns,
                    engineVersion,
                    `${doc.id}#resources.provisions[0].seed`,
                ),
                doc.id,
                logger,
            );
        }
        // canonical order: uses then reads, declaration order within
        const ensureCarriers = [
            ...(doc.resources.uses ?? []).map((binding, index) =>
                [binding, `uses[${index}]`] as const
            ),
            ...(doc.resources.reads ?? []).map((binding, index) =>
                [binding, `reads[${index}]`] as const
            ),
        ];
        for (const [binding, label] of ensureCarriers) {
            if (!binding.ensure) continue;
            (linked.ensures ??= []).push(wrapEnsure(
                await resolveFn(
                    binding.ensure,
                    fns,
                    engineVersion,
                    `${doc.id}#resources.${label}.ensure`,
                ),
                doc.id,
                logger,
            ));
        }
    }
    return linked;
}

// ---------------------------------------------------------------------------
// resource docs (design D30/D31/D33)
// ---------------------------------------------------------------------------

/** Linked fns of one RESOURCE doc — lifecycle + reconcile meters + view
 *  reads, each async + effectful (ResourceOpUtils passed per call). */
export interface LinkedResourceFns {
    verify: (
        data: ResourceOpData,
        utils: ResourceOpUtils,
    ) => Promise<VerifyOutcome>;
    release: (
        data: ResourceOpData,
        utils: ResourceOpUtils,
    ) => Promise<ReleaseOutcome>;
    refresh?: (
        data: ResourceOpData,
        utils: ResourceOpUtils,
    ) => Promise<RefreshOutcome>;
    /** Per estimated usage line (design D39). */
    reconcile: Record<
        string,
        (
            data: ReconcileUsageData,
            utils: ResourceOpUtils,
        ) => Promise<UsageReading>
    >;
    views: Record<
        string,
        (data: ViewData, utils: ResourceOpUtils) => Promise<Json>
    >;
}

/**
 * Wrap a resource-op fn: ctx.data validated before, the outcome after
 * (FN_CONTRACT on either); EngineErrors propagate untouched;
 * retriable:false throws → FN_CONTRACT; any other uncaught throw →
 * RESOURCE_OP_FAILED (retriable — the host activity retries).
 */
function wrapResourceOp<D, R>(
    dataSchema: z.ZodType<D>,
    outSchema: z.ZodType<R>,
    raw: unknown,
    label: string,
    hookName: string,
    logger: HookLogger,
): (data: D, utils: ResourceOpUtils) => Promise<R> {
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
                ctx: { data: D; utils: ResourceOpUtils; logger: HookLogger },
            ) => unknown)({ data: checked.data, utils, logger });
        } catch (error) {
            if (error instanceof EngineError) throw error;
            if (
                typeof error === "object" && error !== null &&
                (error as { retriable?: unknown }).retriable === false
            ) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${label}: ${hookName} hit a deterministic fault: ${error}`,
                    { cause: error },
                );
            }
            throw new EngineError(
                EngineErrorCode.RESOURCE_OP_FAILED,
                `${label}: ${hookName} failed: ${error}`,
                { cause: error },
            );
        }
        const outcome = outSchema.safeParse(result);
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

export async function linkResourceFns(
    doc: ResourceDoc,
    fns: Record<string, FnEntry>,
    engineVersion: string,
    hookLogger: HookLogger = NOOP_HOOK_LOGGER,
): Promise<LinkedResourceFns> {
    const logger = hookLogger;
    const linked: LinkedResourceFns = {
        verify: wrapResourceOp(
            zResourceOpData,
            zVerifyOutcome,
            await resolveFn(
                doc.lifecycle.verify,
                fns,
                engineVersion,
                `${doc.id}#lifecycle.verify`,
            ),
            doc.id,
            "lifecycle.verify",
            logger,
        ),
        release: wrapResourceOp(
            zResourceOpData,
            zReleaseOutcome,
            await resolveFn(
                doc.lifecycle.release,
                fns,
                engineVersion,
                `${doc.id}#lifecycle.release`,
            ),
            doc.id,
            "lifecycle.release",
            logger,
        ),
        reconcile: {},
        views: {},
    };
    if (doc.lifecycle.refresh) {
        linked.refresh = wrapResourceOp(
            zResourceOpData,
            zRefreshOutcome,
            await resolveFn(
                doc.lifecycle.refresh,
                fns,
                engineVersion,
                `${doc.id}#lifecycle.refresh`,
            ),
            doc.id,
            "lifecycle.refresh",
            logger,
        );
    }
    for (const [line, entry] of Object.entries(doc.reconcileUsage ?? {})) {
        linked.reconcile[line] = wrapResourceOp(
            zReconcileUsageData,
            zUsageReading,
            await resolveFn(
                entry.get,
                fns,
                engineVersion,
                `${doc.id}#reconcileUsage.${line}`,
            ),
            doc.id,
            `reconcileUsage.${line}.get`,
            logger,
        );
    }
    for (const [kind, view] of Object.entries(doc.views ?? {})) {
        linked.views[kind] = wrapResourceOp(
            zViewData,
            zJson,
            await resolveFn(
                view.read,
                fns,
                engineVersion,
                `${doc.id}#views.${kind}`,
            ),
            doc.id,
            `views.${kind}.read`,
            logger,
        );
    }
    return linked;
}
