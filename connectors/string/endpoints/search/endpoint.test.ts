import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

// Rate card: portal.usestring.ai/docs/get-started/pricing "Search",
// retrieved 2026-09-22 — $1.00 per 1,000 searches on the Growth tier,
// i.e. $0.001/page. Pinned below wherever a happy-path test asserts
// result.usage.credits.default.

Deno.test("string#search happy: no searchCount, evidence settles at one page", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "best running shoes" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no paging.pages on the response (request omitted searchCount) ⇒
    // evidence falls back to the documented single-page default.
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { PAGE: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("string#search provider error (synthetic 401): zero usage", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "best running shoes" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#search: query required, searchCount capped at 50, no unrecognized fields", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const rejected: Json[] = [
        { searchCount: 10 },
        { query: "shoes", searchCount: 51 },
        { query: "shoes", searchCount: 0 },
        { query: "shoes", region: "us" },
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
    // near-valid twin — same shape, at the documented cap — succeeds
    const result = await runEndpoint({
        unit,
        input: { body: { query: "shoes", searchCount: 50 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
});

Deno.test("string#search: engine defaults to google when omitted", async () => {
    const unit = await testSealedUnit("string#search");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { default?: unknown }
    >;
    assertEquals(properties.engine.default, "google");
});

Deno.test({
    name: "string#search live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#search");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno 2 workspace monorepo guide" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // live convention: shape, not amounts (PR review) — real traffic
        // can settle a different page count than replay's pinned 1
        assertEquals(Object.keys(result.usage.evidence), ["PAGE"]);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
