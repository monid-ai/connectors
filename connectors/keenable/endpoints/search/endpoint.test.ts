import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable: fetch inherits PER_CALL 1, search counts RESULT, one auth fn, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("keenable#")
    ).sort();
    assertEquals(ids, ["keenable#v1/fetch", "keenable#v1/search"]);

    const search = bundle.endpoints["keenable#v1/search"];
    const fetchDoc = bundle.endpoints["keenable#v1/fetch"];
    assertEquals(search.request.method, "POST");
    assertEquals(search.request.url, "https://api.keenable.ai/v1/search");
    assertEquals(fetchDoc.request.method, "GET");
    assertEquals(fetchDoc.request.url, "https://api.keenable.ai/v1/fetch");

    assertEquals(search.auth.inject.$fn.key, fetchDoc.auth.inject.$fn.key);
    assertEquals(search.usage.consolidate, undefined);
    assertEquals(fetchDoc.usage.consolidate, undefined);
    assertEquals(search.input.toRequest, undefined);
    assertEquals(fetchDoc.input.toRequest, undefined);

    // fetch: flat PER_CALL, compiler-synthesized empty quantities
    // (tinyfish/pdl enrich posture); engine appends CALL at settle
    const synthesizedKey = fetchDoc.usage.evidence.$fn.key;
    assertEquals(fetchDoc.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    // search: its own 0|1 evidence (empty result bills 0)
    assert(search.usage.evidence.$fn.key !== synthesizedKey);

    const kinds: Record<string, string> = {
        "keenable#v1/fetch": "PER_CALL",
        "keenable#v1/search": "PER_UNIT",
    };
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        const model = doc.usage.model;
        assertEquals(model.kind, kinds[id], id);
        assertEquals(
            "consumes" in model ? model.consumes : undefined,
            { credit: "default", amount: 1 },
            id,
        );
    }
});

Deno.test("keenable#v1/search happy (synthetic): one credit; fold settles; mode echoed", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "typescript best practices", max_results: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no consolidate ⇒ no claim ⇒ the DERIVED fold is the bill (D2)
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("costDollars" in output, false);
    assertEquals(output.query, "typescript best practices");
    assertEquals(output.mode, "pro");
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("keenable#v1/search empty (synthetic): results [] bills 0", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "zzqxv no such page" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals((result.output as Record<string, unknown>).results, []);
});

Deno.test("keenable#v1/search provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-search.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "Authentication failed",
        message: "Malformed API key",
    });
});

Deno.test("keenable#v1/search: query required; bounds; mode accepted", async () => {
    const unit = await testSealedUnit("keenable#v1/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "x", max_results: 0 },
        { query: "x", max_results: 51 },
        { query: "x", snippet_max_length: 179 },
        { query: "x", snippet_max_length: 10001 },
        { query: "x", published_after: "" },
        { query: "x", query_time: 1790000000 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // passing near-twins of the bounds above; extra keys ride through
    // (looseObject). Replay matches method+URL, not body.
    const passing: Json[] = [
        { query: "x" },
        { query: "x", max_results: 1 },
        { query: "x", max_results: 50 },
        { query: "x", snippet_max_length: 180 },
        { query: "x", snippet_max_length: 10000 },
        { query: "x", bogus: 1 },
        { query: "x", mode: "pro" },
        { query: "x", mode: "realtime" },
        { query: "x", published_after: "2w" },
        { query: "x", query_time: "1790000000" },
        {
            query: "typescript best practices",
            site: "arxiv.org",
            published_after: "2026-01-01",
            max_results: 2,
        },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});

Deno.test({
    name: "keenable#v1/search live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "deno 2 workspace monorepo guide",
                    max_results: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["RESULT"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const output = result.output as Record<string, unknown>;
        assert(
            Array.isArray(output.results),
            "results array present",
        );
        assertEquals(output.query, "deno 2 workspace monorepo guide");
    },
});
