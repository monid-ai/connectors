import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("tinyfish: per-endpoint baseUrl overrides land in the compiled urls", async () => {
    const bundle = await testBundle();
    // multi-host provider with NO provider-level baseUrl — first real use
    assertEquals(
        bundle.endpoints["tinyfish#search"].request.url,
        "https://api.search.tinyfish.ai/",
    );
    assertEquals(
        bundle.endpoints["tinyfish#fetch"].request.url,
        "https://api.fetch.tinyfish.ai/",
    );
    // FREE provider (D27): no vendor meter — no consolidate fn compiles
    // at all, and BOTH quantities slots on BOTH docs are the one
    // compiler-synthesized `() => ({counts: {}})` entry (same $fn.key)
    const search = bundle.endpoints["tinyfish#search"];
    const fetchDoc = bundle.endpoints["tinyfish#fetch"];
    assertEquals(search.usage.consolidate, undefined);
    assertEquals(fetchDoc.usage.consolidate, undefined);
    const synthesizedKey = search.usage.evidence.$fn.key;
    assertEquals(search.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(fetchDoc.usage.evidence.$fn.key, synthesizedKey);
    assertEquals(fetchDoc.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
});

Deno.test("tinyfish#search happy (synthetic): free — zero usage", async () => {
    const unit = await testSealedUnit("tinyfish#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "NVIDIA Q4 FY2025 revenue",
                domain_type: "news",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // FREE model (D25/D26): the DOC's model says "free" — nothing folds,
    // nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("tinyfish#search provider error (synthetic): 429 is data, zero usage", async () => {
    const unit = await testSealedUnit("tinyfish#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "anything" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "tinyfish#search live (gated on TINYFISH_API_KEY)",
    ignore: liveSkip("tinyfish"),
    fn: async () => {
        const unit = await testSealedUnit("tinyfish#search");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "deno 2 release notes" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            Array.isArray((result.output as Record<string, unknown>).results),
            "results array present",
        );
    },
});
