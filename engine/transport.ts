import { applyAuth, envVarFor } from "./auth.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";
import type {
    ParamsResolver,
    PreparedRequest,
    Transport,
    TransportResponse,
} from "./interfaces/mod.ts";

/** Default resolver: env `<NAME>_API_KEY` → { apiKey } (v1 convention). */
export const envParamsResolver: ParamsResolver = (provider) => {
    const value = Deno.env.get(envVarFor(provider));
    const params: Record<string, string> = {};
    if (value) params.apiKey = value;
    return Promise.resolve(params);
};

/**
 * OSS / local / tests: inject credentials HERE, then fetch.
 * `fetch` is injectable → fixture replay. Resolved values never logged.
 */
export function directTransport(opts: {
    params?: ParamsResolver;
    fetch?: typeof fetch;
} = {}): Transport {
    const resolveParams = opts.params ?? envParamsResolver;
    const doFetch = opts.fetch ?? fetch;
    return {
        async execute(req: PreparedRequest): Promise<TransportResponse> {
            const params = await resolveParams(req.provider);
            const authed = await applyAuth(req, params);

            const url = new URL(authed.url);
            for (const [key, value] of Object.entries(authed.query)) {
                url.searchParams.append(key, value);
            }

            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(),
                req.timeouts.requestMs,
            );
            try {
                const response = await doFetch(url.toString(), {
                    method: req.method,
                    headers: {
                        ...(authed.body !== undefined
                            ? { "content-type": "application/json" }
                            : {}),
                        ...authed.headers,
                    },
                    body: authed.body !== undefined
                        ? JSON.stringify(authed.body)
                        : undefined,
                    signal: controller.signal,
                    redirect: "manual",
                });
                const body = await response.text();
                return {
                    status: response.status,
                    body,
                    contentType: response.headers.get("content-type") ??
                        undefined,
                };
            } catch (error) {
                if (error instanceof EngineError) throw error;
                throw new EngineError(
                    EngineErrorCode.EXECUTION_FAILED,
                    `transport failure calling ${req.provider}: ${error}`,
                    { cause: error },
                );
            } finally {
                clearTimeout(timer);
            }
        },
    };
}

/**
 * Hosted mode (interface stub — the implementation lives in monid-services):
 * forwards the PreparedRequest — auth fn ref + entry INTACT, credentials absent —
 * to the Relay, which validates authParams against the Broker credential (KMS),
 * hash-verifies and runs the same auth fn, applies egress hygiene, and returns
 * {status, body}. Secrets never enter the engine process.
 */
export function relayTransport(_opts: {
    relayUrl: string;
    callerAuth: () => Promise<string>;
}): Transport {
    return {
        execute(): Promise<TransportResponse> {
            return Promise.reject(
                new EngineError(
                    EngineErrorCode.NOT_IMPLEMENTED,
                    "relayTransport is implemented by the hosted Relay (monid-services)",
                ),
            );
        },
    };
}
