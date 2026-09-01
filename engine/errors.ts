export const EngineErrorCode = {
    /** Doc requires a newer engine (minEngineVersion > ENGINE_VERSION). */
    UNSUPPORTED_DOC: "UNSUPPORTED_DOC",
    /** A $fn key has no entry in the sealed unit. */
    UNKNOWN_FN: "UNKNOWN_FN",
    /** sha256(entry.src) does not equal the referenced key — tampering/skew. */
    LINK_INTEGRITY: "LINK_INTEGRITY",
    /** Fn entry targets a newer fn ABI than this engine. */
    UNSUPPORTED_FN_ABI: "UNSUPPORTED_FN_ABI",
    /** Doc failed schema parsing. */
    BAD_DOC: "BAD_DOC",
    /**
     * A linked fn broke its slot contract: invalid ctx.data, a throw, or an
     * invalid return (validated against the SAME zod slot schemas that type
     * the def). Absorbs the former BAD_USAGE as the usage-slot case.
     */
    FN_CONTRACT: "FN_CONTRACT",
    /** Caller input failed the endpoint's input schemas. */
    INVALID_INPUT: "INVALID_INPUT",
    /** Resolved auth params failed the provider's authParams schema. */
    MISSING_CREDENTIAL: "MISSING_CREDENTIAL",
    /** Transport-level failure (network, abort). RETRIABLE. */
    EXECUTION_FAILED: "EXECUTION_FAILED",
    /** Response body could not be decoded at all. */
    DECODE_FAILED: "DECODE_FAILED",
    /** Final output failed output.schema (post-transform contract). */
    CONTRACT_VIOLATION: "CONTRACT_VIOLATION",
    /** poll/stop called on a sync endpoint. */
    NOT_ASYNC: "NOT_ASYNC",
    /** run() exceeded timeouts.runMs. */
    TIMEOUT: "TIMEOUT",
    /** Reserved surface (relayTransport stub). */
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;
export type EngineErrorCode =
    (typeof EngineErrorCode)[keyof typeof EngineErrorCode];

const RETRIABLE: ReadonlySet<EngineErrorCode> = new Set([
    EngineErrorCode.EXECUTION_FAILED,
]);

export class EngineError extends Error {
    readonly code: EngineErrorCode;
    readonly retriable: boolean;

    constructor(
        code: EngineErrorCode,
        message: string,
        options?: { cause?: unknown },
    ) {
        super(`[${code}] ${message}`, options);
        this.name = "EngineError";
        this.code = code;
        this.retriable = RETRIABLE.has(code);
    }
}
