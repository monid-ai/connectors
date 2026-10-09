import { fromFileUrl, join } from "@std/path";
import {
    type Bundle,
    type Json,
    loadCategoryRegistry,
    loadConnectorDefs,
    type OwnedResource,
    type ResourceSealedUnit,
    type RunInput,
    type SealedUnit,
    sealResourceUnit,
    sealUnit,
    type Usage,
} from "@shared/core";
import {
    credentialFieldsOf,
    directTransport,
    Engine,
    ENGINE_VERSION,
    envCredentialsPresent,
    envParamsResolver,
    type ResourceReader,
    type RunCompleted,
    type RunnableEndpoint,
    type RunnableResource,
} from "@monid/connector-engine";
import { compileBundle } from "@shared/compiler";
import {
    type Fixture,
    type RecordedCall,
    recordingFetch,
    replayFetch,
} from "./fixtures.ts";

export type RunMode = "replay" | "record" | "live";

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));

let cachedBundle: Promise<Bundle> | undefined;

/** Compile all connectors once per test process — tests run the ARTIFACT. */
export function testBundle(): Promise<Bundle> {
    cachedBundle ??= (async () => {
        const connectorsDir = join(REPO_ROOT, "connectors");
        const [connectors, leafCategories, compilerDenoJson] = await Promise
            .all([
                loadConnectorDefs(connectorsDir),
                loadCategoryRegistry(connectorsDir),
                Deno.readTextFile(
                    join(REPO_ROOT, "shared", "compiler", "deno.json"),
                ),
            ]);
        return await compileBundle(connectors, {
            compilerVersion: JSON.parse(compilerDenoJson).version,
            builtWithEngineVersion: ENGINE_VERSION,
            catalogVersion: "0.0.0-test",
            generatedAt: "1970-01-01T00:00:00.000Z",
            leafCategories,
        });
    })();
    return cachedBundle;
}

export async function testSealedUnit(endpointId: string): Promise<SealedUnit> {
    return sealUnit(await testBundle(), endpointId);
}

export async function testResourceUnit(
    resourceId: string,
): Promise<ResourceSealedUnit> {
    return sealResourceUnit(await testBundle(), resourceId);
}

/** An in-memory ResourceReader over fixture rows — the test stand-in for
 *  the host's ownership window (empty seed = owns nothing). */
export function fixtureReader(rows: OwnedResource[] = []): ResourceReader {
    return {
        owned: (query) =>
            Promise.resolve(
                rows.filter((row) =>
                    row.resource === query.resource &&
                    (query.externalId === undefined ||
                        row.externalId === query.externalId)
                ),
            ),
    };
}

export interface RunEndpointOptions {
    unit: SealedUnit;
    input: RunInput;
    mode: RunMode;
    /** replay mode: the fixture to serve. OMIT it to assert the test
     *  makes ZERO upstream calls (gate misses, reader-only endpoints,
     *  local completions) — any fetch then fails loudly instead of
     *  silently consuming a placeholder chain. */
    fixture?: Fixture;
    /** record mode: captured calls are pushed here. */
    sink?: RecordedCall[];
    /** Owned-resource rows served to `utils.resources` and the ownership
     *  gate. A reader is ALWAYS wired (possibly empty) — bound docs load
     *  regardless; ownership is the fixture's story. */
    resources?: OwnedResource[];
    /** The opaque scope token `ensure` fns see (default "test-scope"). */
    scopeKey?: string;
}

function testTransport(opts: {
    mode: RunMode;
    fixture?: Fixture;
    sink?: RecordedCall[];
    bindings?: Record<string, string>;
    /** The doc's compiled auth.credentials schema. */
    credentials: Record<string, Json>;
}) {
    // the test key satisfies whatever credential SHAPE the doc declares
    // (default `{apiKey}`, or a provider's own — contactout names its two
    // keys), so replay never depends on env
    const testParams = Object.fromEntries(
        credentialFieldsOf(opts.credentials)
            .map((field) => [field, "test-key"]),
    );
    switch (opts.mode) {
        case "replay": {
            if (!opts.fixture) {
                // NO fixture = the test's assertion that ZERO upstream
                // calls happen — strictly stronger than a placeholder
                // chain (which an accidental call could silently consume)
                return directTransport({
                    params: () => Promise.resolve(testParams),
                    fetch: (input, init) =>
                        Promise.reject(
                            new Error(
                                "replay: no fixture — this test expects " +
                                    "zero upstream calls, got " +
                                    `${
                                        (init as { method?: string })
                                            ?.method ?? "GET"
                                    } ${String(input)}`,
                            ),
                        ),
                });
            }
            return directTransport({
                params: () => Promise.resolve(testParams),
                fetch: replayFetch(opts.fixture, opts.bindings ?? {}),
            });
        }
        case "record": {
            if (!opts.sink) throw new Error("record mode requires a sink");
            return directTransport({
                params: envParamsResolver,
                fetch: recordingFetch(fetch, opts.sink),
            });
        }
        case "live":
            return directTransport({ params: envParamsResolver });
    }
}

/** Engine.load with the test wiring — for tests that drive phases
 *  (ensure/start/poll/stop/accrued) themselves. */
export async function loadEndpoint(
    opts: RunEndpointOptions,
): Promise<RunnableEndpoint> {
    // shared-chain bindings (fixture strategy v2): fixture urls may
    // carry {{request.url}}/{{request.origin}} placeholders, bound
    // from THIS endpoint's compiled request
    const requestUrl = opts.unit.doc.request.url;
    const engine = new Engine({
        transport: testTransport({
            mode: opts.mode,
            fixture: opts.fixture,
            sink: opts.sink,
            bindings: {
                "request.url": requestUrl,
                "request.origin": new URL(requestUrl).origin,
            },
            credentials: opts.unit.doc.auth.credentials,
        }),
        // replay: skip real pollAfterMs sleeps — async fixtures replay
        // instantly (also neuters lifecycle utils.sleep waits).
        ...(opts.mode === "replay" ? { sleep: () => Promise.resolve() } : {}),
        resources: fixtureReader(opts.resources ?? []),
        scopeKey: opts.scopeKey ?? "test-scope",
    });
    return await engine.load(opts.unit);
}

/**
 * Execute a compiled sealed unit through Engine.load — the per-endpoint test
 * pipeline. replay = zero network + test key; live/record = real fetch + env key.
 */
export async function runEndpoint(
    opts: RunEndpointOptions,
): Promise<RunCompleted> {
    const loaded = await loadEndpoint(opts);
    return await loaded.run(opts.input);
}

export interface LoadResourceOptions {
    unit: ResourceSealedUnit;
    mode: RunMode;
    fixture?: Fixture;
    sink?: RecordedCall[];
}

/** Engine.loadResource with the test wiring — resource-op tests drive
 *  verify/release/refresh/reconcileUsage/view against replay chains. */
export async function loadResource(
    opts: LoadResourceOptions,
): Promise<RunnableResource> {
    const requestUrl = opts.unit.doc.request.url;
    const engine = new Engine({
        transport: testTransport({
            mode: opts.mode,
            fixture: opts.fixture,
            sink: opts.sink,
            bindings: {
                "request.url": requestUrl,
                "request.origin": new URL(requestUrl).origin,
            },
            credentials: opts.unit.doc.auth.credentials,
        }),
        ...(opts.mode === "replay" ? { sleep: () => Promise.resolve() } : {}),
    });
    return await engine.loadResource(opts.unit);
}

/**
 * The PRE-RUN estimate of a sealed unit — the settle-side twin of
 * `runEndpoint`, so a connector can assert the promise it makes as well as the
 * bill it renders.
 *
 * No fixture and no mode: `usage.estimate` is a PURE hook over the validated
 * input, so there is nothing to replay. The transport rejects every call,
 * which turns an estimate that reaches for IO into a test failure rather than
 * a silent network hit (the same guard `deno task engine:estimate` uses).
 */
export async function estimateEndpoint(
    unit: SealedUnit,
    input: RunInput,
): Promise<Usage> {
    const loaded = await new Engine({
        transport: {
            execute: () =>
                Promise.reject(new Error("estimate is pure — no IO allowed")),
        },
    }).load(unit);
    return loaded.estimate(input);
}

/**
 * The PASSING half of a schema gate: `input` clears input validation.
 *
 * A gate test that only asserts rejections cannot detect a gate that is too
 * WIDE — every near-valid bad input fails, and so would every good one. This
 * asserts the complement: the run may fail afterwards for any other reason
 * (a replay URL mismatch is the usual one, since proving a variant reaches
 * the wire would need its own fixture), but it must not fail with
 * INVALID_INPUT.
 */
export async function assertInputAccepted(
    opts: RunEndpointOptions,
): Promise<void> {
    try {
        await runEndpoint(opts);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("INVALID_INPUT")) {
            throw new Error(
                `the schema gate REJECTED an input that must pass ` +
                    `(${JSON.stringify(opts.input)}): ${message}`,
            );
        }
        // any other failure means validation let the input through, which
        // is the whole claim
    }
}

/**
 * Gate for live tests: `ignore: liveSkip("exa")`. Open only when EVERY
 * credential field the provider declares is set — a multi-key provider
 * names its fields: `liveSkip("contactout", ["workApiKey", "personalApiKey"])`.
 * The env reading itself lives behind the engine's transport boundary.
 */
export function liveSkip(
    providerSlug: string,
    fields?: readonly string[],
): boolean {
    return !envCredentialsPresent(providerSlug, fields);
}
