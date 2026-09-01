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
    await expectCode(loaded.poll(null), EngineErrorCode.NOT_ASYNC);
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
