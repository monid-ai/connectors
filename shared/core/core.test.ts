import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { walk } from "@std/fs";
import { z } from "zod";
import {
    assertPureJson,
    contractConfig,
    defineEndpoint,
    defineProvider,
    docHash,
    fnKey,
    getPath,
    parseSchema,
    presets,
    pruneUndefined,
    stableStringify,
    Unit,
    UsageModelKind,
    ValidationError,
    zeroUsage,
    zJson,
} from "@shared/core";

// ---------------------------------------------------------------------------
// contract config — override-free determinism
// ---------------------------------------------------------------------------

Deno.test("contract config: semver everywhere, loaded from config.yml", () => {
    const semver = /^\d+\.\d+\.\d+$/;
    assert(semver.test(contractConfig.schema.specVersion));
    assert(semver.test(contractConfig.schema.docFormatSince));
    assert(semver.test(contractConfig.schema.fnAbiSince));
});

Deno.test("contract config: no env override paths (never touches Deno.env)", async () => {
    // The CONTRACT loader must stay deterministic: same repo → same constants,
    // regardless of environment. Guard the whole core package.
    const coreDir = fromFileUrl(new URL(".", import.meta.url));
    for await (
        const entry of walk(coreDir, { includeDirs: false, exts: [".ts"] })
    ) {
        if (entry.path.endsWith(".test.ts")) continue;
        const source = await Deno.readTextFile(entry.path);
        assert(
            !source.includes("Deno.env"),
            `${entry.path} references Deno.env — the contract must be override-free`,
        );
    }
});

Deno.test("contract loader IGNORES logging subtrees (tooling carve-out)", () => {
    // compiler.logging exists in config.yml but is tooling config — the frozen
    // contract view must not surface it (it is read via @shared/app-config).
    assert(!("logging" in contractConfig.compiler));
    assert(!("logging" in contractConfig.schema));
});

// ---------------------------------------------------------------------------
// uniform parsing (parseSchema — one error voice everywhere)
// ---------------------------------------------------------------------------

Deno.test("parseSchema: typed value on success; ValidationError with context + sorted paths", () => {
    const schema = z.strictObject({
        a: z.string(),
        nested: z.strictObject({ b: z.number() }),
    });
    assertEquals(
        parseSchema(schema, { a: "x", nested: { b: 1 } }),
        { a: "x", nested: { b: 1 } },
    );
    const error = assertThrows(
        () =>
            parseSchema(schema, { a: 1, nested: { b: "no" } }, "test-context"),
        ValidationError,
    );
    assert(error.message.startsWith("test-context: "));
    // deterministic: path → messages JSON, sorted by path
    assert(error.message.includes('"a"'));
    assert(error.message.includes('"nested.b"'));
    assert(error.message.indexOf('"a"') < error.message.indexOf('"nested.b"'));
});

// ---------------------------------------------------------------------------
// Json type via zod's built-in z.json()
// ---------------------------------------------------------------------------

Deno.test("zJson (z.json()): accepts strict JSON, rejects non-finite numbers and functions", () => {
    assertEquals(zJson.parse({ a: [1, "x", null, { b: true }] }), {
        a: [1, "x", null, { b: true }],
    });
    assert(!zJson.safeParse(Number.POSITIVE_INFINITY).success);
    assert(!zJson.safeParse(Number.NaN).success);
    assert(!zJson.safeParse(() => 1).success);
    assert(!zJson.safeParse({ a: undefined }).success);
});

// ---------------------------------------------------------------------------
// stable serialization (RFC 8785 via canonicalize) + hashing
// ---------------------------------------------------------------------------

Deno.test("stableStringify: key order does not matter, array order does", () => {
    assertEquals(
        stableStringify({ b: 1, a: { d: 2, c: 3 } }),
        stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
    assert(stableStringify([1, 2]) !== stableStringify([2, 1]));
    // sorted keys in the output itself
    assertEquals(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

Deno.test("fnKey / docHash: deterministic, sha256-prefixed", async () => {
    const key = await fnKey("(ctx) => 1");
    assert(key.startsWith("sha256:"));
    assertEquals(key, await fnKey("(ctx) => 1"));
    const hash = await docHash({ b: 1, a: 2 });
    assertEquals(hash, await docHash({ a: 2, b: 1 })); // key order irrelevant
});

// ---------------------------------------------------------------------------
// Json purity helpers
// ---------------------------------------------------------------------------

Deno.test("assertPureJson rejects undefined and functions; pruneUndefined cleans", () => {
    assertThrows(() => assertPureJson({ a: undefined }, "doc"));
    assertThrows(() => assertPureJson({ a: () => 1 }, "doc"));
    assertEquals(pruneUndefined({ a: 1, b: undefined, c: { d: undefined } }), {
        a: 1,
        c: {},
    });
});

// ---------------------------------------------------------------------------
// path subset (deliberate RFC 9535 subset — no wildcards/filters/recursion)
// ---------------------------------------------------------------------------

Deno.test("getPath: dotted keys + numeric indexes; unsupported syntax → undefined", () => {
    const value = { results: [{ id: "a" }, { id: "b" }], cost: { total: 5 } };
    assertEquals(getPath(value, "$.cost.total"), 5);
    assertEquals(getPath(value, "$.results[1].id"), "b");
    assertEquals(getPath(value, "$.missing.deep"), undefined);
    assertEquals(getPath(value, "$..recursive"), undefined); // not in the subset
    assertEquals(getPath(value, "$.results[*]"), undefined); // no wildcards
});

Deno.test("zeroUsage: the forced settle-shape on provider errors", () => {
    assertEquals(zeroUsage(), { counts: {} });
});

// ---------------------------------------------------------------------------
// loader owns folder identity (the compiler never sees folder names)
// ---------------------------------------------------------------------------

Deno.test("loadConnectorDefs: folder != provider.name fails loudly", async () => {
    const dir = await Deno.makeTempDir();
    try {
        await Deno.mkdir(`${dir}/wrong-folder/endpoints`, { recursive: true });
        await Deno.writeTextFile(
            `${dir}/wrong-folder/provider.ts`,
            `export default { name: "other" };`,
        );
        const { loadConnectorDefs } = await import("./load/connector-defs.ts");
        const error = await assertRejects(() => loadConnectorDefs(dir));
        assert(String(error).includes("must equal the folder name"));
        assert(String(error).includes("wrong-folder"));
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});

// ---------------------------------------------------------------------------
// the TYPE layer (design D19a): model-keyed counts + schema-typed bodies —
// the ts-expect-error directives below PROVE the narrowing (each fails
// `deno task check` whenever the generics stop rejecting what they must)
// ---------------------------------------------------------------------------

Deno.test("typed defineEndpoint: the generics narrow (and reject) as designed", () => {
    const meta = {
        displayName: "Typed",
        summary: "Types.",
        categories: ["demo-cat"],
    };
    const request = { method: "POST", path: "/x" } as const;
    const body = z.object({
        q: z.string(),
        maxItems: z.number().optional(),
    });

    // POSITIVE control — literal component keys + typed body access compile:
    const good = defineEndpoint({
        meta,
        request,
        input: { schema: { body } },
        usage: {
            model: {
                kind: UsageModelKind.COMPOSITE,
                components: {
                    "actor-start": { kind: UsageModelKind.PER_CALL },
                    "comment": {
                        kind: UsageModelKind.PER_UNIT,
                        unit: Unit.RESULT,
                    },
                },
            },
            consolidate: ({ data }) => ({
                usage: {
                    // typed body: direct property access, no JSONPath
                    counts: { "comment": data.input.body.maxItems ?? 1 },
                },
            }),
            estimate: ({ data }) => ({
                counts: { "comment": data.input.body.maxItems ?? 1 },
            }),
        },
    });
    assert(good.meta.displayName === "Typed");

    // NEGATIVE controls — each line MUST be a typecheck error:
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: {
                    kind: UsageModelKind.COMPOSITE,
                    components: {
                        "actor-start": { kind: UsageModelKind.PER_CALL },
                        "comment": {
                            kind: UsageModelKind.PER_UNIT,
                            unit: Unit.RESULT,
                        },
                    },
                },
                // @ts-expect-error — typo'd key: not a metered component
                estimate: () => ({
                    counts: { "commnet": 1 },
                }),
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: {
                    kind: UsageModelKind.COMPOSITE,
                    components: {
                        "actor-start": { kind: UsageModelKind.PER_CALL },
                        "comment": {
                            kind: UsageModelKind.PER_UNIT,
                            unit: Unit.RESULT,
                        },
                    },
                },
                // @ts-expect-error — flat component: never a count (D18)
                estimate: () => ({
                    counts: { "actor-start": 1 },
                }),
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_CALL },
                // @ts-expect-error — a COUNTING fn on a flat doc: the
                // estimate slot is `never` ("unsupported" = un-writable)
                estimate: () => ({ counts: { "RESULT": 3 } }),
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                consolidate: ({ data }) => ({
                    usage: {
                        // @ts-expect-error — the body schema has no such field
                        counts: { "RESULT": data.input.body.nope ?? 1 },
                    },
                }),
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                // @ts-expect-error — a leaf doc keys by its unit, not TOKEN
                estimate: () => ({
                    counts: { "TOKEN": 1 },
                }),
            },
        }));
    // Renamed ctx paths (D23 addendum): facts live under their provenance —
    // the OLD flat paths are compile errors everywhere.
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                estimate: ({ data }) => ({
                    counts: {
                        // @ts-expect-error — data.model moved to data.usage.model
                        "RESULT": data.model.kind === "PER_UNIT" ? 1 : 2,
                    },
                }),
            },
        }));
});

Deno.test("typed lifecycle.state: the declared schema types reads AND writes", () => {
    const meta = {
        displayName: "Typed state",
        summary: "State types.",
        categories: ["demo-cat"],
    };
    const request = { method: "POST", path: "/x" } as const;
    const body = z.object({ q: z.string() });
    const stateData = z.object({
        datasetId: z.string(),
        usd: z.number().optional(),
    });

    // POSITIVE control — a poll that reads the typed bag and writes a
    // conforming next state compiles (state.data = z.output of the doc's
    // OWN lifecycle.state schema; sound: engine-validated every tick):
    const good = defineEndpoint({
        meta,
        request,
        input: { schema: { body } },
        usage: {
            model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            consolidate: ({ data }) => ({
                usage: {
                    counts: {
                        "RESULT": data.lifecycle?.state.data?.usd !== undefined
                            ? 1
                            : 0,
                    },
                },
            }),
        },
        lifecycle: {
            state: stateData,
            start: async ({ utils }) => {
                const r = await utils.request();
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: "run-1",
                        data: { datasetId: String(r.status) },
                    },
                };
            },
            poll: async ({ data, utils }) => {
                // typed READ: the threaded bag has the declared shape
                const id = data.lifecycle.state.data?.datasetId ?? "none";
                const r = await utils.http({
                    method: "GET",
                    path: `/jobs/${id}`,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: r.status,
                    output: r.body,
                    // typed WRITE: a conforming whole-state
                    state: { data: { datasetId: id, usd: 0.1 } },
                };
            },
        },
    });
    void good;

    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                consolidate: () => ({ usage: { counts: {} } }),
            },
            lifecycle: {
                state: stateData,
                // @ts-expect-error — mis-shaped state bag (datasetID,
                // typo-cased): the WRITE site fails check, not just the
                // runtime tick gate
                start: async ({ utils }) => {
                    await utils.request();
                    return {
                        kind: "RUNNING",
                        state: { data: { datasetID: "typo-cased" } },
                    };
                },
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { body } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                consolidate: ({ data }) => ({
                    usage: {
                        counts: {
                            // @ts-expect-error — no such field on the
                            // declared state bag (typed READ at settle)
                            "RESULT": data.lifecycle?.state.data?.nope ?? 0,
                        },
                    },
                }),
            },
            lifecycle: {
                state: stateData,
                start: async ({ utils }) => {
                    const r = await utils.request();
                    return {
                        kind: "COMPLETED",
                        httpStatus: r.status,
                        output: r.body,
                    };
                },
            },
        }));
});

Deno.test("typed defineProvider: the provider's OWN lifecycle.state types its fns", () => {
    const stateData = z.strictObject({
        datasetId: z.string().optional(),
        usageTotalUsd: z.number().optional(),
    });

    // POSITIVE control — typed state read (poll + consolidate) and a
    // conforming write compile; the BODY stays Json | undefined (a provider
    // fn serves every endpoint — D23's documented seam):
    const good = defineProvider({
        name: "demo",
        meta: { displayName: "Demo", summary: "Demo provider." },
        request: { baseUrl: "https://api.demo.test" },
        auth: { inject: presets.auth.header("x-demo-key") },
        lifecycle: {
            state: stateData,
            start: async ({ utils }) => {
                const res = await utils.request();
                return {
                    kind: "RUNNING",
                    state: { externalRunId: String(res.status) },
                };
            },
            poll: async ({ data, utils }) => {
                // typed READ of the provider-declared bag
                const id = data.lifecycle.state.data?.datasetId ?? "none";
                const res = await utils.http({
                    method: "GET",
                    path: `/runs/${id}`,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    // typed WRITE — checked against stateData
                    state: { data: { datasetId: id, usageTotalUsd: 0.1 } },
                };
            },
        },
        usage: {
            consolidate: ({ data }) => ({
                usage: {
                    counts: {},
                    ...(data.lifecycle?.state.data?.usageTotalUsd !== undefined
                        ? {
                            cost: {
                                currency: "USD",
                                value: 1,
                                unit: "MICRO_DOLLAR",
                            },
                        }
                        : {}),
                },
            }),
        },
    });
    void good;

    void (() =>
        defineProvider({
            name: "demo",
            meta: { displayName: "Demo", summary: "Demo provider." },
            request: { baseUrl: "https://api.demo.test" },
            auth: { inject: presets.auth.header("x-demo-key") },
            lifecycle: {
                state: stateData,
                // @ts-expect-error — mis-shaped state bag (datasetID,
                // typo-cased): the provider WRITE site fails check —
                // e.g. stashing an unprojected pricing card would too
                start: async ({ utils }) => {
                    await utils.request();
                    return {
                        kind: "RUNNING",
                        state: { data: { datasetID: "typo-cased" } },
                    };
                },
            },
            usage: { consolidate: () => ({ usage: { counts: {} } }) },
        }));
    void (() =>
        defineProvider({
            name: "demo",
            meta: { displayName: "Demo", summary: "Demo provider." },
            request: { baseUrl: "https://api.demo.test" },
            auth: { inject: presets.auth.header("x-demo-key") },
            lifecycle: {
                state: stateData,
                start: async ({ utils }) => {
                    const res = await utils.request();
                    return {
                        kind: "COMPLETED",
                        httpStatus: res.status,
                        output: res.body,
                    };
                },
            },
            usage: {
                consolidate: ({ data }) => ({
                    usage: {
                        counts: {},
                        evidence: {
                            // @ts-expect-error — no such field on the
                            // provider's declared state bag (typed READ)
                            nope: data.lifecycle?.state.data?.nope ?? null,
                        },
                    },
                }),
            },
        }));
});

Deno.test("typed FREE model + typed queryParams: the D25 layer narrows as designed", () => {
    const meta = {
        displayName: "Typed free",
        summary: "Free types.",
        categories: ["demo-cat"],
    };
    const request = { method: "GET", path: "/lookup" } as const;
    const queryParams = z.object({
        q: z.string(),
        limit: z.number().int().min(1).optional(),
    });

    // POSITIVE control — a FREE doc's fns return plain empty counts (the
    // MODEL is the free fact, D25), and the estimate reads TYPED
    // queryParams (pre-toRequest input):
    const good = defineEndpoint({
        meta,
        request,
        input: {
            schema: { queryParams: queryParams.required({ limit: true }) },
        },
        usage: {
            model: { kind: UsageModelKind.FREE },
            estimate: ({ data }) => ({
                counts: {},
                evidence: { requestedLimit: data.input.queryParams.limit },
            }),
            consolidate: () => ({ usage: { counts: {} } }),
        },
    });
    void good;

    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { queryParams } },
            usage: {
                model: { kind: UsageModelKind.FREE },
                // @ts-expect-error — a FREE doc has no metered keys: its
                // fns can write only {} (free bills nothing — D25)
                estimate: () => ({ counts: { "RESULT": 1 } }),
                consolidate: () => ({ usage: { counts: {} } }),
            },
        }));
    void (() =>
        defineEndpoint({
            meta,
            request,
            input: { schema: { queryParams } },
            usage: {
                model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
                estimate: ({ data }) => ({
                    counts: {
                        // @ts-expect-error — no such field on the doc's own
                        // queryParams schema (typed input, D25)
                        "RESULT": data.input.queryParams.nope ?? 1,
                    },
                }),
                consolidate: () => ({ usage: { counts: {} } }),
            },
        }));
});
