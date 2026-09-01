import { greaterThan, parse as parseSemver } from "@std/semver";
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
    type HttpRequestParts,
    InputToRequestContract,
    type InputToRequestFn,
    type Json,
    OutputFromResponseContract,
    type OutputFromResponseFn,
    type RunInput,
    type ToRequestData,
    UsageConsolidateContract,
    type UsageConsolidateFn,
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
    /** THE settle fn: raw envelope → {usage, output?}. */
    usageConsolidate: (data: EnvelopeData) => Consolidated;
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
 * throw becomes FN_CONTRACT.
 */
function wrapContract<
    D,
    R,
    F extends (ctx: { data: D; utils: typeof fnUtils }) => R,
>(
    contract: ContractLike<F>,
    raw: unknown,
    label: string,
    hookName: string,
): (data: D) => R {
    const impl = contract.implement(raw as F);
    return (data: D): R => {
        try {
            return impl({ data, utils: fnUtils } as Parameters<F>[0]);
        } catch (error) {
            throw new EngineError(
                EngineErrorCode.FN_CONTRACT,
                `${label}: ${hookName} broke its contract: ${error}`,
                { cause: error },
            );
        }
    };
}

export async function linkFns(
    doc: EndpointDoc,
    fns: Record<string, FnEntry>,
    engineVersion: string,
): Promise<LinkedFns> {
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
        );
    }
    return linked;
}
