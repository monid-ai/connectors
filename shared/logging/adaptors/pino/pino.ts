/**
 * Pino adaptor — the default Logger implementation. Factory shape borrowed
 * from monid-services `shared/logger` (`createLogger({level, enabled,
 * bindings})`); the OTel stream is omitted here (hosted concern).
 */
import { pino } from "pino";
import type { Logger as PinoLogger } from "pino";
import type { Logger, LogLevel } from "../../interfaces/logger.ts";

export interface LoggerOptions {
    level?: LogLevel;
    enabled?: boolean;
    bindings?: Record<string, unknown>;
}

function wrap(instance: PinoLogger): Logger {
    return {
        debug: (message, fields) => instance.debug(fields ?? {}, message),
        info: (message, fields) => instance.info(fields ?? {}, message),
        warn: (message, fields) => instance.warn(fields ?? {}, message),
        error: (message, fields) => instance.error(fields ?? {}, message),
        child: (bindings) => wrap(instance.child(bindings)),
    };
}

export function createLogger({
    level = "info",
    enabled = true,
    bindings,
}: LoggerOptions = {}): Logger {
    const instance = pino({ level, enabled, base: undefined });
    if (bindings) instance.setBindings(bindings);
    return wrap(instance);
}
