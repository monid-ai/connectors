import { assertEquals, assertRejects } from "@std/assert";
import { FnInterner } from "./fns.ts";
import { preset } from "@shared/core";

Deno.test("FnInterner: analyze a shared factory once while preserving each ref's arguments", async () => {
    const factory = preset("test.identity", (value: string) => () => value);
    const interner = new FnInterner();
    const digest = crypto.subtle.digest;
    let calls = 0;
    crypto.subtle.digest = function (
        this: SubtleCrypto,
        ...args: Parameters<typeof digest>
    ) {
        calls++;
        return digest.apply(this, args);
    } as typeof digest;
    try {
        const a = await interner.intern(factory("a"), "first", "0.1.0");
        const b = await interner.intern(factory("b"), "second", "0.2.0");
        const c = await interner.intern(factory("c"), "third", "0.1.0");
        assertEquals(a.$fn.key, b.$fn.key);
        assertEquals(b.$fn.key, c.$fn.key);
        assertEquals(a.$fn.args, ["a"]);
        assertEquals(b.$fn.args, ["b"]);
        assertEquals(c.$fn.args, ["c"]);
        assertEquals(interner.table[a.$fn.key].api, "0.1.0");
        assertEquals(
            interner.table[a.$fn.key].provenance,
            "presets#test.identity",
        );
        assertEquals(
            calls,
            1,
            "shared factory source should only be digested once per interner",
        );
    } finally {
        crypto.subtle.digest = digest;
    }
});

Deno.test("FnInterner: failed analysis retains the current occurrence's provenance", async () => {
    const forbidden = () => Deno.cwd();
    const interner = new FnInterner();
    await assertRejects(
        () => interner.intern(forbidden, "first-site", "0.1.0"),
        Error,
        "first-site",
    );
    await assertRejects(
        () => interner.intern(forbidden, "second-site", "0.1.0"),
        Error,
        "second-site",
    );
});

Deno.test("FnInterner: warm analysis still rejects invalid per-use ABI", async () => {
    const interner = new FnInterner();
    const fn = () => 1;
    const ref = await interner.intern(fn, "valid", "0.1.0");
    await assertRejects(() => interner.intern(fn, "invalid", "not-semver"));
    assertEquals(
        (await interner.intern(fn, "valid-again", "0.1.0")).$fn.key,
        ref.$fn.key,
    );
    assertEquals(interner.table[ref.$fn.key].provenance, "valid");
});

Deno.test("FnInterner: normalized equivalent ordinary sources retain first provenance", async () => {
    const interner = new FnInterner();
    const a = () => 1;
    const b = () => /* cosmetic only */ 1;
    const digest = crypto.subtle.digest;
    let calls = 0;
    crypto.subtle.digest = function (
        this: SubtleCrypto,
        ...args: Parameters<typeof digest>
    ) {
        calls++;
        return digest.apply(this, args);
    } as typeof digest;
    try {
        const first = await interner.intern(a, "first", "0.1.0");
        const second = await interner.intern(b, "second", "0.1.0");
        assertEquals(first, second);
        assertEquals(interner.table[first.$fn.key].provenance, "first");
        assertEquals(calls, 1);
    } finally {
        crypto.subtle.digest = digest;
    }
});
