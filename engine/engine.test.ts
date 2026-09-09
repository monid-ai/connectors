import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { z } from "zod";
import type { ConnectorSource, RunState, SealedUnit } from "@shared/core";
import {
    defineEndpoint,
    defineProvider,
    presets,
    sealUnit,
} from "@shared/core";
import { compileBundle } from "@shared/compiler";
import {
    directTransport,
    Engine,
    ENGINE_VERSION,
    EngineError,
    EngineErrorCode,
    type Transport,
} from "@monid/connector-engine";

// ---------------------------------------------------------------------------
// helpers: compile a tiny in-memory connector, then poke the sealed unit
// ---------------------------------------------------------------------------

const COMPILE_OPTS = {
    compilerVersion: "0.1.0",
    builtWithEngineVersion: ENGINE_VERSION,
    catalogVersion: "0.0.0-test",
    generatedAt: "1970-01-01T00:00:00.000Z",
    leafCategories: [{ id: "demo-search", displayName: "Demo Search" }],
} as const;

function demoConnector(): ConnectorSource[] {
    return [{
        provider: defineProvider({
            name: "demo",
            meta: { displayName: "Demo", summary: "Demo provider." },
            auth: { inject: presets.auth.header("x-demo-key") },
            request: { baseUrl: "https://api.demo.test" },
        }),
        endpoints: [{
            name: "search",
            def: defineEndpoint({
                meta: {
                    displayName: "Search",
                    summary: "Searches.",
                    categories: ["demo-search"],
                },
                request: { method: "POST", path: "/search" },
                input: { schema: { body: z.object({ q: z.string().min(1) }) } },
                output: {
                    schema: z.object({
                        results: z.array(z.object({ id: z.string() })),
                    }),
                },
                usage: {
                    model: { kind: "PER_UNIT", unit: "RESULT" },
                    // metered docs must estimate (D24)
                    estimate: () => ({ counts: { "RESULT": 1 } }),
                    consolidate: ({ data, utils }) => ({
                        usage: {
                            counts: {
                                "RESULT": utils.json.len(
                                    data.output,
                                    "$.results",
                                ),
                            },
                        },
                    }),
                },
            }),
        }],
    }];
}

async function demoUnit(): Promise<SealedUnit> {
    const bundle = await compileBundle(demoConnector(), COMPILE_OPTS);
    return sealUnit(bundle, "demo#search");
}

function jsonTransport(
    status: number,
    body: unknown,
    seen?: { url?: string; headers?: Record<string, string> },
): Transport {
    return directTransport({
        params: () => Promise.resolve({ apiKey: "k" }),
        fetch: (input, init) => {
            if (seen) {
                seen.url = String(input);
                seen.headers = {
                    ...((init as RequestInit | undefined)?.headers as Record<
                        string,
                        string
                    > ?? {}),
                };
            }
            const text = typeof body === "string" ? body : JSON.stringify(body);
            return Promise.resolve(new Response(text, { status }));
        },
    });
}

const clone = (unit: SealedUnit): SealedUnit =>
    JSON.parse(JSON.stringify(unit));

/** A well-formed threaded state for direct poll/stop calls in tests —
 *  engine-shaped timing + the given fn-owned fields. */
function testState(
    fields: Omit<RunState, "timing"> = {},
): RunState {
    return {
        ...fields,
        timing: {
            startedAt: "2026-01-01T00:00:00.000Z",
            startRequestMs: 5,
            attempts: 0,
            pollMsTotal: 0,
            deadlineAt: "2026-01-01T00:05:00.000Z",
        },
    };
}

async function expectCode(promise: Promise<unknown>, code: EngineErrorCode) {
    const error = await assertRejects(() => promise);
    assert(error instanceof EngineError, `expected EngineError, got ${error}`);
    assertEquals(error.code, code);
}

// ---------------------------------------------------------------------------
// load gates
// ---------------------------------------------------------------------------

Deno.test("ENGINE_VERSION equals engine/deno.json version", async () => {
    const denoJson = JSON.parse(
        await Deno.readTextFile(new URL("./deno.json", import.meta.url)),
    );
    assertEquals(ENGINE_VERSION, denoJson.version);
});

Deno.test("BAD_DOC: malformed sealed unit", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    await expectCode(
        engine.load({ doc: { nope: true }, fns: {} }),
        EngineErrorCode.BAD_DOC,
    );
});

Deno.test("UNSUPPORTED_DOC: doc from a newer engine", async () => {
    const unit = clone(await demoUnit());
    unit.doc.minEngineVersion = "999.0.0";
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    await expectCode(engine.load(unit), EngineErrorCode.UNSUPPORTED_DOC);
});

Deno.test("UNKNOWN_FN: missing table entry", async () => {
    const unit = clone(await demoUnit());
    delete unit.fns[unit.doc.usage.consolidate.$fn.key];
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    await expectCode(engine.load(unit), EngineErrorCode.UNKNOWN_FN);
});

Deno.test("LINK_INTEGRITY: tampered fn source", async () => {
    const unit = clone(await demoUnit());
    const key = unit.doc.usage.consolidate.$fn.key;
    unit.fns[key] = {
        ...unit.fns[key],
        src: "(ctx) => ({ usage: { units: [{ amount: 999, unit: 'call' }] } })",
    };
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    await expectCode(engine.load(unit), EngineErrorCode.LINK_INTEGRITY);
});

Deno.test("UNSUPPORTED_FN_ABI: entry targets a newer ABI", async () => {
    const unit = clone(await demoUnit());
    const key = unit.doc.usage.consolidate.$fn.key;
    unit.fns[key] = { ...unit.fns[key], api: "999.0.0" };
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    await expectCode(engine.load(unit), EngineErrorCode.UNSUPPORTED_FN_ABI);
});

// ---------------------------------------------------------------------------
// pipeline
// ---------------------------------------------------------------------------

Deno.test("happy path: auth injected, usage computed, output validated", async () => {
    const seen: { url?: string; headers?: Record<string, string> } = {};
    const engine = new Engine({
        transport: jsonTransport(
            200,
            { results: [{ id: "a" }, { id: "b" }] },
            seen,
        ),
    });
    const loaded = await engine.load(await demoUnit());
    const result = await loaded.run({ body: { q: "hi" } });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.counts, { "RESULT": 2 });
    assertEquals(seen.url, "https://api.demo.test/search");
    assertEquals(seen.headers?.["x-demo-key"], "k"); // injected inside the transport
});

Deno.test("INVALID_INPUT: body fails the compiled JSON Schema", async () => {
    const engine = new Engine({
        transport: jsonTransport(200, { results: [] }),
    });
    const loaded = await engine.load(await demoUnit());
    await expectCode(
        loaded.start({ body: { q: "" } }),
        EngineErrorCode.INVALID_INPUT,
    );
    await expectCode(loaded.start({}), EngineErrorCode.INVALID_INPUT);
});

Deno.test("INVALID_INPUT: RunInput shape enforced before doc schemas", async () => {
    const engine = new Engine({
        transport: jsonTransport(200, { results: [] }),
    });
    const loaded = await engine.load(await demoUnit());
    // non-object trios and unknown keys never reach buildRequest
    const bad: unknown[] = [
        null,
        [1, 2],
        "q=hi",
        { queryParams: [1, 2] },
        { queryParams: "a=b" },
        { pathParams: { id: 7 } }, // pathParams values must be strings
        { body: {}, extra: true }, // .strict(): unknown keys rejected
    ];
    for (const input of bad) {
        await expectCode(
            loaded.start(input as Parameters<typeof loaded.start>[0]),
            EngineErrorCode.INVALID_INPUT,
        );
    }
});

Deno.test("MISSING_CREDENTIAL: fail-closed before any network call", async () => {
    let fetched = false;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: () => {
                fetched = true;
                return Promise.resolve(new Response("{}"));
            },
        }),
    });
    const loaded = await engine.load(await demoUnit());
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.MISSING_CREDENTIAL,
    );
    assertEquals(fetched, false);
});

Deno.test("vendor non-2xx is DATA: zero usage, raw body, no throw", async () => {
    const engine = new Engine({
        transport: jsonTransport(429, { error: "slow down" }),
    });
    const loaded = await engine.load(await demoUnit());
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 429);
    assertEquals(result.usage.counts, {});
    assertEquals(result.output, { error: "slow down" });
});

Deno.test("sniffing decode: non-JSON body passes through as a faithful string", async () => {
    const engine = new Engine({
        transport: jsonTransport(502, "<html>Bad Gateway</html>"),
    });
    const loaded = await engine.load(await demoUnit());
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, "<html>Bad Gateway</html>");
});

Deno.test("EXECUTION_FAILED is retriable; wraps transport failures", async () => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "k" }),
            fetch: () => Promise.reject(new TypeError("connection refused")),
        }),
    });
    const loaded = await engine.load(await demoUnit());
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assertEquals(error.retriable, true);
});

Deno.test("CONTRACT_VIOLATION: final output fails output.schema", async () => {
    const engine = new Engine({
        transport: jsonTransport(200, { results: [{ wrong: 1 }] }),
    });
    const loaded = await engine.load(await demoUnit());
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.CONTRACT_VIOLATION,
    );
});

Deno.test("FN_CONTRACT: compute returning junk fails closed (slot z.function enforced)", async () => {
    const connectors = demoConnector();
    connectors[0].endpoints[0].def.usage = {
        model: { kind: "PER_UNIT", unit: "RESULT" },
        estimate: () => ({ counts: {} }), // metered docs must estimate (D24)
        consolidate: ((_ctx: never) => 42) as never,
    };
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, { results: [{ id: "a" }] }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("FN_CONTRACT: fn that throws fails closed", async () => {
    const connectors = demoConnector();
    connectors[0].endpoints[0].def.usage = {
        model: { kind: "PER_UNIT", unit: "RESULT" },
        estimate: () => ({ counts: {} }), // metered docs must estimate (D24)
        consolidate: ((_ctx: never) => {
            throw new Error("boom");
        }) as never,
    };
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, { results: [{ id: "a" }] }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("FN_CONTRACT: strict json.len on a missing path fails closed (never bills 0)", async () => {
    const connectors = demoConnector();
    // typo'd path — strict len must throw, not settle at count 0
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, { items: [{ id: "a" }] }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    // compute reads $.results, response only has $.items
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.FN_CONTRACT);
    assert(String(error.message).includes("json.len"));
});

Deno.test("NOT_ASYNC: poll on a sync endpoint", async () => {
    const engine = new Engine({
        transport: jsonTransport(200, { results: [] }),
    });
    const loaded = await engine.load(await demoUnit());
    await expectCode(
        loaded.poll({ body: { q: "x" } }, testState()),
        EngineErrorCode.NOT_ASYNC,
    );
});

// ---------------------------------------------------------------------------
// hook fallback semantics (compiled upstream, executed here)
// ---------------------------------------------------------------------------

Deno.test("hook fallback: endpoint fromResponse REPLACES the provider's", async () => {
    const connectors = demoConnector();
    connectors[0].provider = defineProvider({
        name: "demo",
        meta: { displayName: "Demo", summary: "Demo provider." },
        auth: { inject: presets.auth.header("x-demo-key") },
        request: { baseUrl: "https://api.demo.test" },
        output: {
            fromResponse: ({ data, utils }) =>
                utils.json.merge(data.output, { providerRan: true }),
        },
    });
    connectors[0].endpoints[0].def = defineEndpoint({
        meta: {
            displayName: "Search",
            summary: "Searches.",
            categories: ["demo-search"],
        },
        request: { method: "POST", path: "/search" },
        input: { schema: { body: z.object({ q: z.string().min(1) }) } },
        output: {
            fromResponse: ({ data, utils }) =>
                utils.json.merge(data.output, { endpointRan: true }),
        },
        usage: {
            model: { kind: "PER_CALL" },
            consolidate: presets.usage.perCall(),
        },
    });
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, { results: [] }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    const result = await loaded.run({ body: { q: "x" } });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.endpointRan, true);
    // fallback, not chain: the provider hook did NOT run
    assertEquals("providerRan" in output, false);
});

// ---------------------------------------------------------------------------
// usage.consolidate — billing fields absorbed into the structured usage
// ---------------------------------------------------------------------------

Deno.test("usage.consolidate: settles the RAW envelope before fromResponse", async () => {
    const connectors = demoConnector();
    connectors[0].endpoints[0].def = defineEndpoint({
        meta: {
            displayName: "Search",
            summary: "Searches.",
            categories: ["demo-search"],
        },
        request: { method: "POST", path: "/search" },
        input: { schema: { body: z.object({ q: z.string().min(1) }) } },
        usage: {
            model: { kind: "PER_UNIT", unit: "RESULT" },
            estimate: () => ({ counts: {} }), // metered docs must estimate (D24)
            // ONE settle fn: extract usage AND absorb the billing field
            consolidate: ({ data, utils }) => ({
                usage: {
                    counts: {
                        "RESULT": utils.json.len(data.output, "$.results"),
                    },
                    cost: utils.money.fromDollars(
                        utils.json.num(data.output, "$.costDollars.total"),
                    ),
                },
                output: utils.json.omit(data.output, ["costDollars"]),
            }),
        },
        output: {
            // fromResponse runs on the CONSOLIDATED output — proves ordering
            fromResponse: ({ data, utils }) =>
                utils.json.merge(data.output, {
                    sawCost:
                        utils.json.optionalGet(data.output, "$.costDollars") !==
                            undefined,
                }),
        },
    });
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, {
            results: [{ id: "a" }],
            costDollars: { total: 0.005 },
        }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    const result = await loaded.run({ body: { q: "x" } });
    const output = result.output as Record<string, unknown>;
    // compute read the RAW envelope: cost extracted as micro-dollars
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 5_000,
        unit: "MICRO_DOLLAR",
    });
    // consolidate absorbed the vendor field before fromResponse saw it
    assertEquals("costDollars" in output, false);
    assertEquals(output.sawCost, false);
});

Deno.test("usage.consolidate: absent output = unchanged payload", async () => {
    // demoConnector's settle fn returns {usage} only — the raw body passes through
    const engine = new Engine({
        transport: jsonTransport(200, { results: [{ id: "a" }], extra: true }),
    });
    const loaded = await engine.load(await demoUnit());
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.output, { results: [{ id: "a" }], extra: true });
    assertEquals(result.usage.counts, { "RESULT": 1 });
});

Deno.test("FN_CONTRACT: bad OUTPUT half of the settle pair fails closed", async () => {
    const connectors = demoConnector();
    connectors[0].endpoints[0].def.usage = {
        model: { kind: "PER_CALL" },
        consolidate: ((_ctx: never) => ({
            usage: { counts: {} },
            output: () => 1, // not Json — the pair contract rejects it
        })) as never,
    };
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    const engine = new Engine({
        transport: jsonTransport(200, { results: [] }),
    });
    const loaded = await engine.load(sealUnit(bundle, "demo#search"));
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

// ---------------------------------------------------------------------------
// moneyUtil (the monetary half of the hook ABI)
// ---------------------------------------------------------------------------

Deno.test("moneyUtil: fromDollars/fromMicroDollars produce micro-dollar canon", async () => {
    const { moneyUtil } = await import("./fn-utils.ts");
    assertEquals(moneyUtil.fromDollars(0.005), {
        currency: "USD",
        value: 5_000,
        unit: "MICRO_DOLLAR",
    });
    assertEquals(moneyUtil.fromMicroDollars(1234.6), {
        currency: "USD",
        value: 1_235,
        unit: "MICRO_DOLLAR",
    });
});

// ---------------------------------------------------------------------------
// jsonUtil (the fn ABI surface) — strictness contract
// ---------------------------------------------------------------------------

Deno.test("jsonUtil: strict lookups throw on absence; optional* return undefined", async () => {
    const { jsonUtil } = await import("./fn-utils.ts");
    const value = { cost: { total: 5 }, results: [1, 2] };
    // strict: present works, absent throws
    assertEquals(jsonUtil.num(value, "$.cost.total"), 5);
    assertEquals(jsonUtil.len(value, "$.results"), 2);
    assertEquals(jsonUtil.get(value, "$.cost"), { total: 5 });
    assertThrows(() => jsonUtil.num(value, "$.missing"), Error, "optionalNum");
    assertThrows(() => jsonUtil.len(value, "$.missing"), Error, "optionalLen");
    assertThrows(() => jsonUtil.get(value, "$.missing"), Error, "optionalGet");
    // optional: absent → undefined
    assertEquals(jsonUtil.optionalNum(value, "$.missing"), undefined);
    assertEquals(jsonUtil.optionalLen(value, "$.missing"), undefined);
    assertEquals(jsonUtil.optionalGet(value, "$.missing"), undefined);
});

Deno.test("jsonUtil: type mismatch ALWAYS throws — optional means absent, never garbage", async () => {
    const { jsonUtil } = await import("./fn-utils.ts");
    const value = { cost: "not-a-number", results: { not: "an array" } };
    assertThrows(
        () => jsonUtil.num(value, "$.cost"),
        Error,
        "not a finite number",
    );
    assertThrows(
        () => jsonUtil.optionalNum(value, "$.cost"),
        Error,
        "not a finite number",
    );
    assertThrows(() => jsonUtil.len(value, "$.results"), Error, "not an array");
    assertThrows(
        () => jsonUtil.optionalLen(value, "$.results"),
        Error,
        "not an array",
    );
    // invalid path SYNTAX throws in both variants (a bad path is a bug, not absence)
    assertThrows(
        () => jsonUtil.optionalNum(value, "$..bad"),
        Error,
        "invalid path syntax",
    );
});

Deno.test("jsonUtil: transformers stay shape-tolerant (merge deep-appends, pick skips absent)", async () => {
    const { jsonUtil } = await import("./fn-utils.ts");
    assertEquals(
        jsonUtil.merge({ a: 1, nested: { keep: true } }, {
            nested: { added: 2 },
            b: 3,
        }),
        { a: 1, nested: { keep: true, added: 2 }, b: 3 },
    );
    assertEquals(jsonUtil.merge("not-an-object", { a: 1 }), { a: 1 });
    assertEquals(
        jsonUtil.pick({ costDollars: { total: 5 }, requestId: "r", noise: 1 }, [
            "$.costDollars",
            "$.requestId",
            "$.missing",
        ]),
        { costDollars: { total: 5 }, requestId: "r" },
    );
});

// ---------------------------------------------------------------------------
// lifecycle (async run protocol) — start → poll* → settle, stop, state rules
// ---------------------------------------------------------------------------

/** Serve a scripted response sequence; capture what the engine sent. */
function scriptTransport(
    responses: Array<{ status: number; body: unknown }>,
    seen?: Array<{ method: string; url: string }>,
): Transport {
    let index = 0;
    return directTransport({
        params: () => Promise.resolve({ apiKey: "k" }),
        fetch: (input, init) => {
            seen?.push({
                method: (init as RequestInit | undefined)?.method ?? "GET",
                url: String(input),
            });
            const scripted = responses[index++];
            if (!scripted) {
                return Promise.reject(new Error("script exhausted"));
            }
            const text = typeof scripted.body === "string"
                ? scripted.body
                : JSON.stringify(scripted.body);
            return Promise.resolve(
                new Response(text, {
                    status: scripted.status,
                }),
            );
        },
    });
}

/**
 * An async demo connector: the WHOLE lifecycle at provider level (the
 * actorRunLifecycle pattern) — start POSTs the endpoint's request, polls
 * /jobs/{id}, fetches /jobs/{id}/items on success, aborts on stop; billing
 * signals stashed in state at completion; consolidate reads them back.
 */
function asyncConnector(): ConnectorSource[] {
    return [{
        provider: defineProvider({
            name: "asyncdemo",
            meta: { displayName: "Async Demo", summary: "Async demo." },
            auth: { inject: presets.auth.header("x-demo-key") },
            request: { baseUrl: "https://api.asyncdemo.test" },
            timeouts: { requestMs: 1_000, runMs: 5_000, pollMs: 5 },
            lifecycle: {
                start: async ({ data, utils, logger }) => {
                    logger.debug("starting job", { url: data.request.url });
                    // the default relay: method/url from the compiled
                    // request, body from the caller input
                    const res = await utils.request();
                    if (res.status < 200 || res.status >= 300) {
                        return {
                            kind: "COMPLETED",
                            httpStatus: res.status,
                            output: res.body,
                        };
                    }
                    const jobId = utils.json.get(res.body, "$.jobId");
                    if (typeof jobId !== "string") {
                        throw new Error("vendor returned no jobId");
                    }
                    return {
                        kind: "RUNNING",
                        state: { externalRunId: jobId },
                    };
                },
                poll: async ({ data, utils }) => {
                    const jobId = String(
                        utils.json.get(data.lifecycle.state, "$.externalRunId"),
                    );
                    const res = await utils.http({
                        method: "GET",
                        path: "/jobs/" + encodeURIComponent(jobId),
                    });
                    if (res.status < 200 || res.status >= 300) {
                        return {
                            kind: "COMPLETED",
                            httpStatus: res.status,
                            output: res.body,
                        };
                    }
                    const status = utils.json.get(res.body, "$.status");
                    if (status === "running") {
                        // ABSENT state — the previous fn-state carries
                        // forward untouched (whole-state semantics, D21)
                        return { kind: "RUNNING" };
                    }
                    if (status === "failed") {
                        // in-body vendor failure → synthesized 500 (error-as-data)
                        return {
                            kind: "COMPLETED",
                            httpStatus: 500,
                            output: { message: "job failed" },
                        };
                    }
                    const items = await utils.http({
                        method: "GET",
                        path: "/jobs/" + encodeURIComponent(jobId) + "/items",
                    });
                    if (items.status < 200 || items.status >= 300) {
                        return {
                            kind: "COMPLETED",
                            httpStatus: items.status,
                            output: items.body,
                        };
                    }
                    const usd = utils.json.optionalNum(res.body, "$.usd");
                    return {
                        kind: "COMPLETED",
                        httpStatus: 200,
                        output: items.body,
                        state: {
                            externalRunId: jobId,
                            ...(usd !== undefined ? { data: { usd } } : {}),
                        },
                    };
                },
                stop: async ({ data, utils }) => {
                    const jobId = String(
                        utils.json.get(data.lifecycle.state, "$.externalRunId"),
                    );
                    await utils.http({
                        method: "POST",
                        path: "/jobs/" + encodeURIComponent(jobId) + "/abort",
                    });
                },
            },
            usage: {
                model: { kind: "PER_UNIT", unit: "RESULT" },
                // metered docs must estimate (D24)
                estimate: () => ({ counts: { "RESULT": 1 } }),
                consolidate: ({ data, utils }) => {
                    const usd = utils.json.optionalNum(
                        data.lifecycle?.state ?? null,
                        "$.data.usd",
                    );
                    return {
                        usage: {
                            counts: {
                                "RESULT": Array.isArray(data.output)
                                    ? data.output.length
                                    : 0,
                            },
                            ...(usd !== undefined
                                ? { cost: utils.money.fromDollars(usd) }
                                : {}),
                        },
                    };
                },
            },
        }),
        endpoints: [{
            name: "job",
            def: defineEndpoint({
                meta: {
                    displayName: "Job",
                    summary: "Runs a job.",
                    categories: ["demo-search"],
                },
                request: { method: "POST", path: "/jobs" },
                input: { schema: { body: z.object({ q: z.string() }) } },
            }),
        }],
    }];
}

async function asyncUnit(
    mutate?: (connectors: ConnectorSource[]) => void,
): Promise<SealedUnit> {
    const connectors = asyncConnector();
    mutate?.(connectors);
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    return sealUnit(bundle, "asyncdemo#jobs");
}

const INSTANT_SLEEP = { sleep: () => Promise.resolve() };

Deno.test("lifecycle: compiled doc carries lifecycle refs, pollMs, and the 0.0.1 floor", async () => {
    const unit = await asyncUnit();
    assert(unit.doc.lifecycle);
    assertEquals(unit.doc.timeouts.pollMs, 5);
    assertEquals(unit.doc.minEngineVersion, "0.0.1");
    // the sealed unit closes over all three lifecycle fns
    assert(unit.fns[unit.doc.lifecycle.start.$fn.key]);
    assert(unit.fns[unit.doc.lifecycle.poll!.$fn.key]);
    assert(unit.fns[unit.doc.lifecycle.stop!.$fn.key]);
});

Deno.test("lifecycle happy path: start → poll(running) → poll(done) → result fetch → settle", async () => {
    const seen: Array<{ method: string; url: string }> = [];
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: { status: "done", usd: 0.5 } },
            { status: 200, body: [{ id: "a" }, { id: "b" }, { id: "c" }] },
        ], seen),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(await asyncUnit());
    const result = await loaded.run({ body: { q: "hi" } });
    assertEquals(result.kind, "COMPLETED");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.counts, { "RESULT": 3 });
    // ENGINE-stamped provider timing (t_provider_* slices): a start tick +
    // two poll ticks were measured
    assertEquals(result.timing.attempts, 2);
    assert(result.timing.providerTotalMs >= 0);
    // cost came from STATE stashed at the poll tick (settle reads the state)
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 500_000,
        unit: "MICRO_DOLLAR",
    });
    assertEquals(result.output, [{ id: "a" }, { id: "b" }, { id: "c" }]);
    // wire sequence: start request (the doc's request), poll, poll, items
    assertEquals(seen.map((call) => `${call.method} ${call.url}`), [
        "POST https://api.asyncdemo.test/jobs",
        "GET https://api.asyncdemo.test/jobs/j1",
        "GET https://api.asyncdemo.test/jobs/j1",
        "GET https://api.asyncdemo.test/jobs/j1/items",
    ]);
});

Deno.test("lifecycle: start returns RUNNING with state (externalRunId + engine timing) + doc pollMs", async () => {
    // deterministic clock: each read advances 100ms
    let fakeMs = 0;
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: "j9" } }]),
        now: () => new Date(fakeMs += 100),
    });
    const loaded = await engine.load(await asyncUnit());
    const tick = await loaded.start({ body: { q: "x" } });
    assertEquals(tick, {
        kind: "RUNNING",
        state: {
            externalRunId: "j9",
            // ENGINE-owned: stamped at t0 (100ms), tick measured 100ms,
            // deadline = startedAt + runMs (5s)
            timing: {
                startedAt: new Date(100).toISOString(),
                startRequestMs: 100,
                attempts: 0,
                pollMsTotal: 0,
                deadlineAt: new Date(100 + 5_000).toISOString(),
            },
        },
        pollAfterMs: 5,
    });
});

Deno.test("lifecycle: poll advances engine timing (attempts, pollMsTotal, lastPolledAt)", async () => {
    let fakeMs = 0;
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j9" } },
            { status: 200, body: { status: "running" } },
        ]),
        now: () => new Date(fakeMs += 100),
    });
    const loaded = await engine.load(await asyncUnit());
    const started = await loaded.start({ body: { q: "x" } });
    assert(started.kind === "RUNNING");
    const polled = await loaded.poll({ body: { q: "x" } }, started.state);
    assert(polled.kind === "RUNNING");
    // fn returned NO state — the previous fn-state carried forward (D21)
    assertEquals(polled.state.externalRunId, "j9");
    assertEquals(polled.state.timing.attempts, 1);
    assertEquals(polled.state.timing.pollMsTotal, 100);
    assertEquals(polled.state.timing.lastPolledAt, new Date(300).toISOString());
    // start-tick facts survive untouched
    assertEquals(polled.state.timing.startedAt, new Date(100).toISOString());
    assertEquals(polled.state.timing.startRequestMs, 100);
});

Deno.test("lifecycle: whole-state semantics — present replaces WHOLESALE, absent keeps", async () => {
    // the poll returns a state WITHOUT `data` on the second tick — under
    // whole-state semantics the earlier data bag is GONE (replaced
    // wholesale), not inherited; a third tick with NO state keeps all
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "stash" } },
            { status: 200, body: { status: "replace" } },
            { status: 200, body: { status: "running" } },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.poll = async (
                { data, utils },
            ) => {
                const jobId = String(
                    utils.json.get(data.lifecycle.state, "$.externalRunId"),
                );
                const res = await utils.http({
                    method: "GET",
                    path: "/jobs/" + jobId,
                });
                const status = utils.json.get(res.body, "$.status");
                if (status === "stash") {
                    return {
                        kind: "RUNNING",
                        state: {
                            externalRunId: jobId,
                            stage: "s1",
                            data: { usd: 1 },
                        },
                    };
                }
                if (status === "replace") {
                    // WHOLE next state — no `data`: the bag must vanish
                    return {
                        kind: "RUNNING",
                        state: { externalRunId: jobId, stage: "s2" },
                    };
                }
                // absent state — everything carries forward untouched
                return { kind: "RUNNING" };
            };
        }),
    );
    const started = await loaded.start({ body: { q: "x" } });
    assert(started.kind === "RUNNING");
    const first = await loaded.poll({ body: { q: "x" } }, started.state);
    assert(first.kind === "RUNNING");
    assertEquals(first.state.stage, "s1");
    assertEquals(first.state.data, { usd: 1 });
    const second = await loaded.poll({ body: { q: "x" } }, first.state);
    assert(second.kind === "RUNNING");
    assertEquals(second.state.stage, "s2");
    assertEquals(second.state.data, undefined); // replaced WHOLESALE
    const third = await loaded.poll({ body: { q: "x" } }, second.state);
    assert(third.kind === "RUNNING");
    assertEquals(third.state.externalRunId, "j1"); // absent state keeps
    assertEquals(third.state.stage, "s2");
});

Deno.test("lifecycle: corrupt threaded state fails closed on the way in (INVALID_INPUT)", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: {} }]),
    });
    const loaded = await engine.load(await asyncUnit());
    await expectCode(
        loaded.poll(
            { body: { q: "x" } },
            { externalRunId: "j1" } as unknown as RunState, // timing missing
        ),
        EngineErrorCode.INVALID_INPUT,
    );
});

Deno.test("lifecycle: reserved state.externalRunId must be a non-empty string", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: 42 } }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async ({ utils }) => {
                const res = await utils.request();
                // JSON round-trip launders the type — the RUNTIME value is a
                // number where the reserved key demands a string (closed
                // terms are plain JS, no TS casts available)
                return JSON.parse(JSON.stringify({
                    kind: "RUNNING",
                    state: {
                        externalRunId: utils.json.get(res.body, "$.jobId"),
                    },
                }));
            };
        }),
    );
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("lifecycle: output.fromError digests provider-error envelopes (zero usage untouched)", async () => {
    const engine = new Engine({
        transport: scriptTransport([
            { status: 429, body: { error: { message: "slow down" } } },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.output = {
                fromError: ({ data, utils }) => ({
                    message: utils.json.optionalGet(
                        data.output,
                        "$.error.message",
                    ) ?? "vendor error",
                    raw: data.output,
                }),
            };
        }),
    );
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.counts, {});
    assertEquals(result.output, {
        message: "slow down",
        raw: { error: { message: "slow down" } },
    });
});

Deno.test("lifecycle: fn-synthesized status carries providerHttpStatus (ours/theirs)", async () => {
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "failed" } },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.poll = async (
                { data, utils },
            ) => {
                const jobId = String(
                    utils.json.get(data.lifecycle.state, "$.externalRunId"),
                );
                await utils.http({ method: "GET", path: "/jobs/" + jobId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500, // OURS (synthesized: the JOB failed)
                    providerHttpStatus: 200, // THEIRS (the poll call succeeded)
                    output: { message: "job failed" },
                };
            };
        }),
    );
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
});

Deno.test("lifecycle: vendor non-2xx at start is DATA — zero usage, no throw", async () => {
    const engine = new Engine({
        transport: scriptTransport([
            { status: 429, body: { error: "slow down" } },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(await asyncUnit());
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 429);
    assertEquals(result.usage.counts, {});
    assertEquals(result.output, { error: "slow down" });
});

Deno.test("lifecycle: in-body vendor failure → fn-synthesized 500, zero usage", async () => {
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "failed" } },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(await asyncUnit());
    const result = await loaded.run({ body: { q: "x" } });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.usage.counts, {});
    assertEquals(result.output, { message: "job failed" });
});

Deno.test("lifecycle: per-tick pollAfterMs override wins over the doc default", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: { jobId: "j1" } }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async (
                { data, utils },
            ) => {
                const res = await utils.http({
                    method: data.request.method,
                    url: data.request.url,
                });
                return {
                    kind: "RUNNING",
                    state: {
                        data: { jobId: utils.json.get(res.body, "$.jobId") },
                    },
                    pollAfterMs: 7,
                };
            };
        }),
    );
    const tick = await loaded.start({ body: { q: "x" } });
    assert(tick.kind === "RUNNING");
    assertEquals(tick.pollAfterMs, 7);
});

Deno.test("lifecycle: running without a resolved poll fails closed (CONTRACT_VIOLATION)", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: "j1" } }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            delete connectors[0].provider.lifecycle!.poll;
            delete connectors[0].provider.lifecycle!.stop;
        }),
    );
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.CONTRACT_VIOLATION,
    );
});

Deno.test("lifecycle: oversized state fails closed (FN_CONTRACT, state_max_bytes)", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: "j1" } }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async (
                { data, utils },
            ) => {
                await utils.http({
                    method: data.request.method,
                    url: data.request.url,
                });
                return {
                    kind: "RUNNING",
                    state: { data: { blob: "x".repeat(70_000) } },
                };
            };
        }),
    );
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.FN_CONTRACT);
    assert(String(error.message).includes("state"));
});

Deno.test("lifecycle: uncaught fn throw → EXECUTION_FAILED (retriable), not FN_CONTRACT", async () => {
    // a 2xx body with a NON-STRING jobId hits the fn's own `throw new
    // Error(...)` — an UNKNOWN throw stays retriable
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: { jobId: 42 } }]),
    });
    const loaded = await engine.load(await asyncUnit());
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assertEquals(error.retriable, true);
});

Deno.test("lifecycle: escaped JsonPathError → FN_CONTRACT (deterministic, retriable=false)", async () => {
    // start reads $.jobId strictly; a 2xx body WITHOUT it throws a
    // JsonPathError (retriable=false) inside the fn — a deterministic fn
    // bug must NOT be absorbed by the retriable EXECUTION_FAILED mapping
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: { nope: true } }]),
    });
    const loaded = await engine.load(await asyncUnit());
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.FN_CONTRACT);
    assertEquals(error.retriable, false);
});

Deno.test("lifecycle: junk outcome → FN_CONTRACT", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: {} }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = ((_ctx: never) =>
                Promise.resolve(42)) as never;
        }),
    );
    await expectCode(
        loaded.start({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("lifecycle: stop runs the fn and swallows every failure", async () => {
    const seen: Array<{ method: string; url: string }> = [];
    const engine = new Engine({
        // abort returns 409 (already finished) — swallowed
        transport: scriptTransport([{ status: 409, body: {} }], seen),
    });
    const loaded = await engine.load(await asyncUnit());
    await loaded.stop({ body: { q: "x" } }, testState({ externalRunId: "j1" }));
    assertEquals(seen, [{
        method: "POST",
        url: "https://api.asyncdemo.test/jobs/j1/abort",
    }]);
    // transport-level failure is swallowed too
    const engine2 = new Engine({ transport: scriptTransport([]) });
    const loaded2 = await engine2.load(await asyncUnit());
    await loaded2.stop(
        { body: { q: "x" } },
        testState({ externalRunId: "j1" }),
    );
});

Deno.test("utils.request: {body: null} overrides PRESENCE-based (never falls back to the input)", async () => {
    // null is valid JSON — a present body override must egress, even null
    const seen: Array<{ body?: string }> = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "k" }),
            fetch: (_url, init) => {
                seen.push({
                    body: (init as RequestInit | undefined)?.body as
                        | string
                        | undefined,
                });
                return Promise.resolve(
                    new Response(JSON.stringify({ jobId: "j1" }), {
                        status: 201,
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async ({ utils }) => {
                await utils.request({ body: null });
                return { kind: "RUNNING", state: { externalRunId: "j1" } };
            };
        }),
    );
    await loaded.start({ body: { q: "x" } });
    // the egressed body is JSON null — NOT the caller's {q: "x"}
    assertEquals(seen[0]?.body, "null");
});

Deno.test("lifecycle: a long pollAfterMs cannot oversleep the run budget", async () => {
    // the fn requests a 1-hour nap; the run budget is 3.5s — the sleep must
    // be capped at the remaining budget so TIMEOUT fires on time
    const sleeps: number[] = [];
    let fakeMs = 0;
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: {} }, // the abort
        ]),
        sleep: (ms) => {
            sleeps.push(ms);
            return Promise.resolve();
        },
        now: () => new Date(fakeMs += 1_000),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.timeouts = {
                requestMs: 1_000,
                runMs: 3_500,
                pollMs: 3_600_000, // the doc asks for hour-long naps
            };
        }),
    );
    const error = await assertRejects(() => loaded.run({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.TIMEOUT);
    // every sleep was capped by the remaining budget, never the raw hour
    assert(sleeps.length > 0);
    for (const ms of sleeps) {
        assert(ms <= 3_500, `sleep ${ms}ms exceeded the 3500ms budget`);
    }
});

Deno.test("lifecycle: run() timeout stops the vendor job then throws TIMEOUT", async () => {
    const seen: Array<{ method: string; url: string }> = [];
    // deterministic clock: each read advances 1s — runMs 3500 expires after
    // start + three polls, independent of wall time
    let fakeMs = 0;
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: { status: "running" } },
            { status: 200, body: {} }, // the abort
        ], seen),
        ...INSTANT_SLEEP,
        now: () => new Date(fakeMs += 1_000),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.timeouts = {
                requestMs: 1_000,
                runMs: 3_500,
                pollMs: 5,
            };
        }),
    );
    const error = await assertRejects(() => loaded.run({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.TIMEOUT);
    // the LAST wire call is the best-effort abort
    assertEquals(seen[seen.length - 1], {
        method: "POST",
        url: "https://api.asyncdemo.test/jobs/j1/abort",
    });
});

Deno.test("lifecycle: utils.http per-call header/query overrides + auth still injected", async () => {
    const headersSeen: Array<Record<string, string>> = [];
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "k" }),
        fetch: (input, init) => {
            headersSeen.push({
                ...((init as RequestInit | undefined)?.headers as Record<
                    string,
                    string
                > ?? {}),
            });
            const url = String(input);
            if (url.endsWith("/jobs")) {
                return Promise.resolve(
                    new Response(JSON.stringify({ jobId: "j1" }), {
                        status: 200,
                    }),
                );
            }
            return Promise.resolve(
                new Response(JSON.stringify({ status: "running" }), {
                    status: 200,
                }),
            );
        },
    });
    const engine = new Engine({ transport });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async (
                { data, utils },
            ) => {
                const res = await utils.http({
                    method: data.request.method,
                    url: data.request.url,
                    headers: { "x-extra": "yes" },
                    body: data.input.body ?? {},
                });
                return {
                    kind: "RUNNING",
                    state: {
                        data: { jobId: utils.json.get(res.body, "$.jobId") },
                    },
                };
            };
        }),
    );
    const tick = await loaded.start({ body: { q: "x" } });
    assert(tick.kind === "RUNNING");
    assertEquals(headersSeen[0]["x-extra"], "yes");
    assertEquals(headersSeen[0]["x-demo-key"], "k"); // auth injected by the transport
});

// ---------------------------------------------------------------------------
// estimate — pure entrypoint, and estimate-vs-actual comparability
// ---------------------------------------------------------------------------

Deno.test("estimate matches actual when counts are true (counts deep-equal)", async () => {
    // the chain is CONSTRUCTED count-true: 2 queries in, 2 items out — so
    // the pre-run estimate and the settled usage agree EXACTLY (the same
    // counts KEYS, the same math target; one card row prices both)
    const engine = new Engine({
        transport: scriptTransport([
            { status: 201, body: { jobId: "j1" } },
            { status: 200, body: { status: "done" } },
            { status: 200, body: [{ id: "a" }, { id: "b" }] },
        ]),
        ...INSTANT_SLEEP,
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].endpoints[0].def.input = {
                schema: { body: z.object({ queries: z.array(z.string()) }) },
            };
            connectors[0].endpoints[0].def.usage = {
                // raw-def slot (no defineEndpoint typing here): accept the
                // broad ctx, narrow inside — doc-authored fns get this typed
                estimate: (
                    { data }: { data: { input: { body?: unknown } } },
                ) => {
                    const body = data.input.body as
                        | { queries?: string[] }
                        | undefined;
                    return {
                        counts: {
                            "RESULT": Math.max(body?.queries?.length ?? 0, 1),
                        },
                    };
                },
            };
        }),
    );
    const input = { body: { queries: ["a", "b"] } };
    const estimated = loaded.estimate(input);
    const actual = await loaded.run(input);
    assertEquals(estimated.counts, { "RESULT": 2 });
    assertEquals(estimated.counts, actual.usage.counts);
});

Deno.test("estimate: pure (no IO); a flat doc's vector is engine-derived (D24)", async () => {
    let fetched = false;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "k" }),
            fetch: () => {
                fetched = true;
                return Promise.reject(new Error("estimate must not do IO"));
            },
        }),
    });
    // flat doc, NO estimate fn: the engine derives the whole vector from
    // the model — the flat charge under the reserved CALL key (D24)
    const loaded = await engine.load(
        await usageUnit({
            model: { kind: "PER_CALL" },
            consolidate: () => ({ usage: { counts: {} } }),
        }),
    );
    assertEquals(loaded.estimate({ body: { q: "x" } }), {
        counts: { "CALL": 1 },
    });
    assertEquals(fetched, false);
});

// ---------------------------------------------------------------------------
// counts ↔ model discipline (design D19) — validateUsage at settle + estimate
// ---------------------------------------------------------------------------

/** demoUnit with a mutated usage block (model/consolidate/estimate). */
async function usageUnit(
    usage: ConnectorSource["endpoints"][number]["def"]["usage"],
): Promise<SealedUnit> {
    const connectors = demoConnector();
    // metered docs must declare an estimate (D24 compile rule) — splice a
    // benign one when the test under-specifies ({} passes countsMismatch)
    const metered = usage?.model !== undefined &&
        (usage.model.kind === "PER_UNIT" ||
            (usage.model.kind === "COMPOSITE" &&
                Object.values(usage.model.components)
                    .some((c) => c.kind === "PER_UNIT")));
    connectors[0].endpoints[0].def.usage =
        metered && usage?.estimate === undefined
            ? { ...usage, estimate: () => ({ counts: {} }) }
            : usage;
    delete connectors[0].endpoints[0].def.output; // free-form outputs
    const bundle = await compileBundle(connectors, COMPILE_OPTS);
    return sealUnit(bundle, "demo#search");
}

Deno.test("FN_CONTRACT: counts key on a doc with nothing countable (PER_CALL)", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    const loaded = await engine.load(
        await usageUnit({
            model: { kind: "PER_CALL" },
            consolidate: () => ({ usage: { counts: { "RESULT": 1 } } }),
        }),
    );
    await expectCode(
        loaded.run({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("FN_CONTRACT: leaf PER_UNIT counts must key the model's unit", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    const loaded = await engine.load(
        await usageUnit({
            model: { kind: "PER_UNIT", unit: "RESULT" },
            consolidate: () => ({ usage: { counts: { "TOKEN": 5 } } }),
        }),
    );
    await expectCode(
        loaded.run({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("FN_CONTRACT: composite counts key must name a METERED component", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    // "start" is PER_CALL — flat components never appear in counts
    const loaded = await engine.load(
        await usageUnit({
            model: {
                kind: "COMPOSITE",
                components: {
                    "start": { kind: "PER_CALL" },
                    "item": { kind: "PER_UNIT", unit: "RESULT" },
                },
            },
            consolidate: () => ({ usage: { counts: { "start": 1 } } }),
        }),
    );
    await expectCode(
        loaded.run({ body: { q: "x" } }),
        EngineErrorCode.FN_CONTRACT,
    );
});

Deno.test("composite settle: counts keyed by component id pass; {} always passes", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    const loaded = await engine.load(
        await usageUnit({
            model: {
                kind: "COMPOSITE",
                components: {
                    "start": { kind: "PER_CALL" },
                    "item": { kind: "PER_UNIT", unit: "RESULT" },
                },
            },
            consolidate: () => ({ usage: { counts: { "item": 7 } } }),
        }),
    );
    const result = await loaded.run({ body: { q: "x" } });
    // COMPLETE VECTOR (D24): the engine appends the flat component's 1 —
    // counts × rates = the whole bill, no model join
    assertEquals(result.usage.counts, { "item": 7, "start": 1 });

    const empty = await engine.load(
        await usageUnit({
            model: { kind: "PER_CALL" },
            consolidate: () => ({ usage: { counts: {} } }),
        }),
    );
    // leaf PER_CALL bills under the reserved CALL key (D24)
    assertEquals(
        (await empty.run({ body: { q: "x" } })).usage.counts,
        { "CALL": 1 },
    );
});

Deno.test("FN_CONTRACT: estimate counts are validated like settled ones", async () => {
    const engine = new Engine({ transport: jsonTransport(200, {}) });
    const loaded = await engine.load(
        await usageUnit({
            model: { kind: "PER_UNIT", unit: "RESULT" },
            consolidate: () => ({ usage: { counts: {} } }),
            estimate: () => ({ counts: { "nope": 1 } }),
        }),
    );
    assertThrows(
        () => loaded.estimate({ body: { q: "x" } }),
        EngineError,
        "FN_CONTRACT",
    );
});

Deno.test("generic keying: provider-seam fns derive the counts key from data.usage.model", async () => {
    // leaf PER_UNIT → the unit; COMPOSITE → the sole metered component id.
    // The generic idiom survives ONLY at the provider seam (apify's shared
    // consolidate) — doc-local fns hardcode their literal key (design D23).
    const keyedConsolidate = (ctx: {
        data: { output: unknown; usage: { model: unknown } };
        utils: unknown;
    }) => {
        const { len } = (ctx.utils as {
            json: { len: (v: unknown, p: string) => number };
        }).json;
        const model = ctx.data.usage.model as
            | { kind: "PER_UNIT"; unit: string }
            | {
                kind: "COMPOSITE";
                components: Record<string, { kind: string; unit?: string }>;
            }
            | { kind: "PER_CALL" };
        let key;
        switch (model.kind) {
            case "PER_UNIT":
                key = model.unit;
                break;
            case "COMPOSITE":
                key = Object.entries(model.components)
                    .find(([, c]) => c.kind === "PER_UNIT")?.[0];
                break;
            case "PER_CALL":
                key = undefined;
                break;
        }
        const amount = len(ctx.data.output, "$.results");
        return {
            usage: { counts: key === undefined ? {} : { [key]: amount } },
        };
    };
    const engine = new Engine({
        transport: jsonTransport(200, { results: [{ id: "a" }] }),
    });
    const composite = await engine.load(
        await usageUnit({
            model: {
                kind: "COMPOSITE",
                components: {
                    "actor-start": { kind: "PER_CALL" },
                    "comment": { kind: "PER_UNIT", unit: "RESULT" },
                },
            },
            consolidate: keyedConsolidate,
            estimate: ({ data }: { data: { usage: { model: unknown } } }) => {
                const model = data.usage.model as {
                    kind: string;
                    components?: Record<string, { kind: string }>;
                };
                const key = model.kind === "COMPOSITE"
                    ? Object.entries(model.components ?? {})
                        .find(([, c]) => c.kind === "PER_UNIT")?.[0]
                    : undefined;
                return { counts: key === undefined ? {} : { [key]: 3 } };
            },
        }),
    );
    assertEquals(
        composite.estimate({ body: { q: "x" } }).counts,
        { "comment": 3, "actor-start": 1 },
    );
    assertEquals(
        (await composite.run({ body: { q: "x" } })).usage.counts,
        { "comment": 1, "actor-start": 1 },
    );
    const leafEngine = new Engine({
        transport: jsonTransport(200, { results: [{ id: "a" }] }),
    });
    const leaf = await leafEngine.load(
        await usageUnit({
            model: { kind: "PER_UNIT", unit: "RESULT" },
            consolidate: keyedConsolidate,
        }),
    );
    assertEquals(
        (await leaf.run({ body: { q: "x" } })).usage.counts,
        { "RESULT": 1 },
    );
});

Deno.test("lifecycle compile checks: poll without start; endpoint pollMs dead config", async () => {
    // poll/stop without start
    {
        const connectors = asyncConnector();
        delete connectors[0].provider.lifecycle!.start;
        await assertRejects(
            () => compileBundle(connectors, COMPILE_OPTS),
            Error,
            "lifecycle.poll/stop without lifecycle.start",
        );
    }
    // endpoint-level pollMs on a doc with no resolved poll
    {
        const connectors = demoConnector();
        connectors[0].endpoints[0].def.timeouts = { pollMs: 1_000 };
        await assertRejects(
            () => compileBundle(connectors, COMPILE_OPTS),
            Error,
            "dead config",
        );
    }
});

Deno.test("sync docs: no lifecycle/pollMs; floor = fn_abi_since (ctx ABI), not async machinery", async () => {
    const bundle = await compileBundle(demoConnector(), COMPILE_OPTS);
    // 0.0.1 via fn_abi_since (the pre-release contract floor) — NOT
    // because of anything async: sync docs carry no lifecycle surface
    assertEquals(
        bundle.endpoints["demo#search"].minEngineVersion,
        "0.0.1",
    );
    assertEquals(bundle.endpoints["demo#search"].lifecycle, undefined);
    assertEquals(bundle.endpoints["demo#search"].timeouts.pollMs, undefined);
});
