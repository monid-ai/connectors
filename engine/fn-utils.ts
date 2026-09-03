import {
    type Currency,
    type EndpointDoc,
    type FnEntry,
    formatZodError,
    getPath,
    type Json,
    type JsonUtil,
    type LifecycleUtils,
    type LogUtil,
    type MoneyUtil,
    PATH_PATTERN,
    zHttpCall,
} from "@shared/core";
import type { Logger } from "@shared/logging";
import { EngineError, EngineErrorCode } from "./errors.ts";
import type { PreparedRequest, Transport } from "./interfaces/mod.ts";
import { sniffDecode } from "./transport.ts";

function lastSegment(path: string): string {
    const match = path.match(/\.([A-Za-z_][A-Za-z0-9_-]*)(\[\d+\])*$/);
    return match ? match[1] : path;
}

/** Path lookup that separates the three cases: syntax error (throw always),
 *  absent (undefined), present (the value). */
function lookup(value: Json, path: string): Json | undefined {
    if (!PATH_PATTERN.test(path)) {
        throw new Error(`invalid path syntax: ${path}`);
    }
    return getPath(value, path);
}

function deepOmit(value: Json, keys: ReadonlySet<string>): Json {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((item) => deepOmit(item, keys));
    const out: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value)) {
        if (keys.has(key)) continue;
        out[key] = deepOmit(item, keys);
    }
    return out;
}

function deepMerge(value: Json, fields: Record<string, Json>): Json {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        // merging fields into a non-object replaces it with the fields object
        return { ...fields };
    }
    const out: Record<string, Json> = { ...value };
    for (const [key, field] of Object.entries(fields)) {
        const existing = out[key];
        out[key] = existing !== null && typeof existing === "object" &&
                !Array.isArray(existing) &&
                field !== null && typeof field === "object" &&
                !Array.isArray(field)
            ? deepMerge(existing, field as Record<string, Json>)
            : field;
    }
    return out;
}

/**
 * The engine's JsonUtil implementation — `ctx.utils.json` (interface in
 * @shared/core schema/json/util.ts — the interface/impl split mirrors the
 * Logger pattern: contract in core, execution here).
 * Part of the fn ABI (versioned by ENGINE_VERSION), never fnTable content.
 *
 * STRICTNESS (see the interface contract in @shared/core): lookups throw on
 * absence (a typo'd path must never silently bill zero); `optional*` variants
 * return undefined on absence but STILL throw on a present value of the
 * wrong type; transformers stay shape-tolerant. Throws inside slot fns
 * surface as FN_CONTRACT — wrong bills fail closed.
 */
export const jsonUtil: JsonUtil = {
    get: (value, path) => {
        const found = lookup(value, path);
        if (found === undefined) {
            throw new Error(
                `json.get: nothing at ${path} (use optionalGet if absence is expected)`,
            );
        }
        return found;
    },
    optionalGet: (value, path) => lookup(value, path),
    num: (value, path) => {
        const found = lookup(value, path);
        if (found === undefined) {
            throw new Error(
                `json.num: nothing at ${path} (use optionalNum if absence is expected)`,
            );
        }
        if (typeof found !== "number" || !Number.isFinite(found)) {
            throw new Error(
                `json.num: value at ${path} is not a finite number`,
            );
        }
        return found;
    },
    optionalNum: (value, path) => {
        const found = lookup(value, path);
        if (found === undefined) return undefined;
        if (typeof found !== "number" || !Number.isFinite(found)) {
            throw new Error(
                `json.optionalNum: value at ${path} is not a finite number`,
            );
        }
        return found;
    },
    len: (value, path) => {
        const found = lookup(value, path);
        if (found === undefined) {
            throw new Error(
                `json.len: nothing at ${path} (use optionalLen if absence is expected)`,
            );
        }
        if (!Array.isArray(found)) {
            throw new Error(`json.len: value at ${path} is not an array`);
        }
        return found.length;
    },
    optionalLen: (value, path) => {
        const found = lookup(value, path);
        if (found === undefined) return undefined;
        if (!Array.isArray(found)) {
            throw new Error(
                `json.optionalLen: value at ${path} is not an array`,
            );
        }
        return found.length;
    },
    /** Deep-remove the named keys anywhere in the value. */
    omit: (value, keys) => deepOmit(value, new Set(keys)),
    /** Keep only the values at the given paths (absent paths skipped), keyed by last segment. */
    pick: (value, paths) => {
        const out: Record<string, Json> = {};
        for (const path of paths) {
            const found = lookup(value, path);
            if (found !== undefined) out[lastSegment(path)] = found;
        }
        return out;
    },
    /** Deep-merge (append) fields into an object value; non-objects are replaced. */
    merge: (value, fields) => deepMerge(value, fields),
};

/**
 * The engine's MoneyUtil implementation — `ctx.utils.money` (interface in
 * @shared/core schema/usage/monetary.ts; conversions match monid-services
 * monetary-conversions.ts). Micro-dollar is the canonical storage unit.
 */
export const moneyUtil: MoneyUtil = {
    fromDollars: (dollars, currency = "USD" as Currency) => ({
        currency,
        value: Math.round(dollars * 1_000_000),
        unit: "MICRO_DOLLAR",
    }),
    fromMicroDollars: (microDollars, currency = "USD" as Currency) => ({
        currency,
        value: Math.round(microDollars),
        unit: "MICRO_DOLLAR",
    }),
};

/** The ctx.utils namespace assembled by the engine (ALL of the hook ABI's
 *  host half lives in THIS file; the interfaces live in @shared/core). */
export const fnUtils = Object.freeze({ json: jsonUtil, money: moneyUtil });

/**
 * `ctx.utils` for the LIFECYCLE hook family — the pure ABI plus the effect
 * capabilities. `http` is the v2 provider runtime (v1 `ProviderRuntime`):
 * CONSTRUCTED FROM the doc's request + auth, per-call overridable on every
 * field EXCEPT auth (injected by the transport at egress — fns never see
 * credentials):
 *   - `path` resolves against the doc request URL's ORIGIN (v1 apiPath
 *     semantics); an absolute `url` may target any host.
 *   - `headers` merge OVER the doc's request headers; `requestMs` overrides
 *     the doc's per-request timeout.
 *   - responses come back sniff-decoded `{status, body}`; vendor non-2xx is
 *     DATA (returned), transport failures throw EXECUTION_FAILED (retriable)
 *     through the fn unless it catches.
 * A malformed call shape is a fn bug → FN_CONTRACT, fail-closed.
 */
export function makeLifecycleUtils(opts: {
    doc: EndpointDoc;
    injectEntry: FnEntry;
    transport: Transport;
    logger: Logger;
}): LifecycleUtils {
    const { doc, injectEntry, transport, logger } = opts;
    const origin = new URL(doc.request.url).origin;
    const log: LogUtil = {
        debug: (message, fields) => logger.debug(message, fields),
        info: (message, fields) => logger.info(message, fields),
        warn: (message, fields) => logger.warn(message, fields),
        error: (message, fields) => logger.error(message, fields),
    };
    const utils: LifecycleUtils = {
        json: jsonUtil,
        money: moneyUtil,
        log,
        http: async (call) => {
            const parsed = zHttpCall.safeParse(call);
            if (!parsed.success) {
                throw new EngineError(
                    EngineErrorCode.FN_CONTRACT,
                    `${doc.id}: utils.http call invalid: ${
                        formatZodError(parsed.error)
                    }`,
                );
            }
            const c = parsed.data;
            const prepared: PreparedRequest = {
                method: c.method,
                url: c.url ?? origin + c.path,
                headers: { ...doc.request.headers, ...c.headers },
                query: { ...c.queryParams },
                body: c.body,
                auth: {
                    inject: { ref: doc.auth.inject, entry: injectEntry },
                    credentials: doc.auth.credentials,
                },
                provider: doc.provider,
                timeouts: {
                    requestMs: c.requestMs ?? doc.timeouts.requestMs,
                },
            };
            const response = await transport.execute(prepared);
            return { status: response.status, body: sniffDecode(response) };
        },
    };
    return Object.freeze(utils);
}
