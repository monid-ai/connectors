import type {
    EndpointDoc,
    FnEntry,
    FnRef,
    HttpMethod,
    Json,
    JsonSchemaDoc,
    RunCompleted,
    RunInput,
    RunResult,
} from "@shared/core";
import type { Logger } from "@shared/logging";

/**
 * The engine's PUBLIC INTERFACE — monid-services `interfaces/` +
 * implementation pattern. Hosts (the CLI, the test runner, the hosted
 * Temporal worker) code against these shapes, never against the classes.
 */

/** The transport contract. Auth is UNEXECUTED here: the inject fn ref + its
 *  entry travel with the request so any injector (directTransport locally,
 *  the hosted Relay) can verify + run it self-contained. The engine pipeline
 *  never sees credentials. */
export interface PreparedRequest {
    method: HttpMethod;
    /** Absolute, pathParams already substituted. */
    url: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: Json;
    auth: {
        inject: { ref: FnRef; entry: FnEntry };
        credentials: JsonSchemaDoc;
    };
    /** Credential lookup key (provider name). */
    provider: string;
    timeouts: { requestMs: number };
}

export interface TransportResponse {
    status: number;
    body: string;
    contentType?: string;
}

/** The only IO port of the engine. Owns credential injection + egress. */
export interface Transport {
    execute(req: PreparedRequest): Promise<TransportResponse>;
}

export type ParamsResolver = (
    provider: string,
) => Promise<Record<string, string>>;

export interface EngineCtx {
    /** The only IO port — owns credential injection + egress. */
    transport: Transport;
    now?: () => Date;
    logger?: Logger;
}

/** Result shapes live in @shared/core (schema/run/result.ts — zod-first,
 *  flat, kind-discriminated; they cross process boundaries by value).
 *  Re-exported here so hosts import the engine interface in one place. */
export type { RunCompleted, RunResult };

/** Load side: sealed unit in, runnable endpoint out (fail-closed gates). */
export interface ConnectorEngine {
    load(unitJson: unknown): Promise<RunnableEndpoint>;
}

/** Execution side: Temporal-activity-shaped (start/poll/stop stateless,
 *  strict-JSON in/out, no sleeps) + the OSS `run()` loop (the only sleeper). */
export interface RunnableEndpoint {
    readonly doc: EndpointDoc;
    start(runInput: RunInput): Promise<RunResult>;
    poll(state: Json): Promise<RunResult>;
    stop(state: Json): Promise<void>;
    run(
        runInput: RunInput,
        opts?: { signal?: AbortSignal },
    ): Promise<RunCompleted>;
}
