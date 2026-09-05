import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { z } from "zod";
import type { ConnectorSource, SealedUnit } from "@shared/core";
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
                    consolidate: ({ data, utils }) => ({
                        usage: {
                            units: [{
                                amount: utils.json.len(
                                    data.output,
                                    "$.results",
                                ),
                                unit: "result",
                            }],
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
    assertEquals(result.usage.units, [{ amount: 2, unit: "result" }]);
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
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
    // typo'd path — strict len must throw, not settle at 0 units
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
        loaded.poll({ body: { q: "x" } }, null),
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
        usage: { consolidate: presets.usage.perCall() },
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
            // ONE settle fn: extract usage AND absorb the billing field
            consolidate: ({ data, utils }) => ({
                usage: {
                    units: [{
                        amount: utils.json.len(data.output, "$.results"),
                        unit: "result",
                    }],
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
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
});

Deno.test("FN_CONTRACT: bad OUTPUT half of the settle pair fails closed", async () => {
    const connectors = demoConnector();
    connectors[0].endpoints[0].def.usage = {
        consolidate: ((_ctx: never) => ({
            usage: { units: [{ amount: 1, unit: "call" }] },
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
                            kind: "completed",
                            httpStatus: res.status,
                            output: res.body,
                        };
                    }
                    const jobId = utils.json.get(res.body, "$.jobId");
                    return {
                        kind: "running",
                        state: { externalRunId: String(jobId) },
                    };
                },
                poll: async ({ data, utils }) => {
                    const jobId = String(
                        utils.json.get(data.state, "$.externalRunId"),
                    );
                    const res = await utils.http({
                        method: "GET",
                        path: "/jobs/" + encodeURIComponent(jobId),
                    });
                    if (res.status < 200 || res.status >= 300) {
                        return {
                            kind: "completed",
                            httpStatus: res.status,
                            output: res.body,
                        };
                    }
                    const status = utils.json.get(res.body, "$.status");
                    if (status === "running") {
                        return { kind: "running", state: data.state };
                    }
                    if (status === "failed") {
                        // in-body vendor failure → synthesized 500 (error-as-data)
                        return {
                            kind: "completed",
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
                            kind: "completed",
                            httpStatus: items.status,
                            output: items.body,
                        };
                    }
                    const usd = utils.json.optionalNum(res.body, "$.usd");
                    return {
                        kind: "completed",
                        httpStatus: 200,
                        output: items.body,
                        state: {
                            externalRunId: jobId,
                            ...(usd !== undefined ? { usd } : {}),
                        },
                    };
                },
                stop: async ({ data, utils }) => {
                    const jobId = String(
                        utils.json.get(data.state, "$.externalRunId"),
                    );
                    await utils.http({
                        method: "POST",
                        path: "/jobs/" + encodeURIComponent(jobId) + "/abort",
                    });
                },
            },
            usage: {
                consolidate: ({ data, utils }) => {
                    const usd = utils.json.optionalNum(
                        data.state ?? null,
                        "$.usd",
                    );
                    return {
                        usage: {
                            units: [{
                                amount: Array.isArray(data.output)
                                    ? data.output.length
                                    : 0,
                                unit: "result",
                            }],
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
    return sealUnit(bundle, "asyncdemo#job");
}

const INSTANT_SLEEP = { sleep: () => Promise.resolve() };

Deno.test("lifecycle: compiled doc carries lifecycle refs, pollMs, and the 0.2.0 floor", async () => {
    const unit = await asyncUnit();
    assert(unit.doc.lifecycle);
    assertEquals(unit.doc.timeouts.pollMs, 5);
    assertEquals(unit.doc.minEngineVersion, "0.2.0");
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
    assertEquals(result.kind, "completed");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 3, unit: "result" }]);
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

Deno.test("lifecycle: start returns running with state (externalRunId) + doc pollMs", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: "j9" } }]),
    });
    const loaded = await engine.load(await asyncUnit());
    const tick = await loaded.start({ body: { q: "x" } });
    assertEquals(tick, {
        kind: "running",
        state: { externalRunId: "j9" },
        pollAfterMs: 5,
    });
});

Deno.test("lifecycle: reserved state.externalRunId must be a non-empty string", async () => {
    const engine = new Engine({
        transport: scriptTransport([{ status: 201, body: { jobId: 42 } }]),
    });
    const loaded = await engine.load(
        await asyncUnit((connectors) => {
            connectors[0].provider.lifecycle!.start = async ({ utils }) => {
                const res = await utils.request();
                return {
                    kind: "running",
                    // number where the reserved key demands a string
                    state: {
                        externalRunId: utils.json.get(res.body, "$.jobId"),
                    },
                };
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
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
                    utils.json.get(data.state, "$.externalRunId"),
                );
                await utils.http({ method: "GET", path: "/jobs/" + jobId });
                return {
                    kind: "completed",
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
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
                    kind: "running",
                    state: { jobId: utils.json.get(res.body, "$.jobId") },
                    pollAfterMs: 7,
                };
            };
        }),
    );
    const tick = await loaded.start({ body: { q: "x" } });
    assert(tick.kind === "running");
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
                return { kind: "running", state: { blob: "x".repeat(70_000) } };
            };
        }),
    );
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.FN_CONTRACT);
    assert(String(error.message).includes("state"));
});

Deno.test("lifecycle: uncaught fn throw → EXECUTION_FAILED (retriable), not FN_CONTRACT", async () => {
    // start reads $.jobId strictly; a 2xx body without it throws inside the fn
    const engine = new Engine({
        transport: scriptTransport([{ status: 200, body: { nope: true } }]),
    });
    const loaded = await engine.load(await asyncUnit());
    const error = await assertRejects(() => loaded.start({ body: { q: "x" } }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assertEquals(error.retriable, true);
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
    await loaded.stop({ body: { q: "x" } }, { externalRunId: "j1" });
    assertEquals(seen, [{
        method: "POST",
        url: "https://api.asyncdemo.test/jobs/j1/abort",
    }]);
    // transport-level failure is swallowed too
    const engine2 = new Engine({ transport: scriptTransport([]) });
    const loaded2 = await engine2.load(await asyncUnit());
    await loaded2.stop({ body: { q: "x" } }, { externalRunId: "j1" });
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
                    kind: "running",
                    state: { jobId: utils.json.get(res.body, "$.jobId") },
                };
            };
        }),
    );
    const tick = await loaded.start({ body: { q: "x" } });
    assert(tick.kind === "running");
    assertEquals(headersSeen[0]["x-extra"], "yes");
    assertEquals(headersSeen[0]["x-demo-key"], "k"); // auth injected by the transport
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
    // 0.2.0 via fn_abi_since (the {data, utils, logger} ctx) — NOT because
    // of anything async: sync docs carry no lifecycle surface at all
    assertEquals(
        bundle.endpoints["demo#search"].minEngineVersion,
        "0.2.0",
    );
    assertEquals(bundle.endpoints["demo#search"].lifecycle, undefined);
    assertEquals(bundle.endpoints["demo#search"].timeouts.pollMs, undefined);
});
