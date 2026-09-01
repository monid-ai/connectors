import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { walk } from "@std/fs";
import { z } from "zod";
import {
    assertPureJson,
    contractConfig,
    docHash,
    fnKey,
    getPath,
    parseSchema,
    pruneUndefined,
    stableStringify,
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
    assertEquals(zeroUsage(), { units: [{ amount: 0, unit: "call" }] });
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
