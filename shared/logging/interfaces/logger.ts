/**
 * Logger — the pluggable logging seam (contract only, no pino types).
 *
 * Engine, compiler, and CLI accept anything satisfying this STRUCTURAL
 * interface; the default implementation is the pino adaptor
 * (adaptors/pino/ — monid-services `interfaces/` + `adaptors/<impl>/` pattern).
 * Hosted Temporal workers pass their own pino instance through this seam.
 */
export interface Logger {
    debug(message: string, fields?: Record<string, unknown>): void;
    info(message: string, fields?: Record<string, unknown>): void;
    warn(message: string, fields?: Record<string, unknown>): void;
    error(message: string, fields?: Record<string, unknown>): void;
    /** New logger with bindings attached to every message. */
    child(bindings: Record<string, unknown>): Logger;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
