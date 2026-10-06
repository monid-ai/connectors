import { assertAlmostEquals, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

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

Deno.test("string#search: query required, searchCount capped at 300, no unrecognized fields", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const rejected: Json[] = [
        { searchCount: 10 },
        { query: "shoes", searchCount: 301 },
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
        input: { body: { query: "shoes", searchCount: 300 } },
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

const estimateFor = async (body: RunInput["body"]) => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    }).load(await testSealedUnit("string#search"));
    return loaded.estimate({ body });
};

Deno.test("string#search: the estimate holds one page, or the 36-page cap when google pages", async () => {
    assertEquals(await estimateFor({ query: "shoes" }), {
        credits: { default: 0.001 },
        evidence: { PAGE: 1 },
    });
    // 36 × 0.001 is not exact in floating point
    const hold = await estimateFor({ query: "shoes", searchCount: 5 });
    assertEquals(hold.evidence, { PAGE: 36 });
    assertAlmostEquals(hold.credits.default, 0.036, 1e-9);
    assertEquals(
        await estimateFor({ query: "shoes", engine: "brave", searchCount: 5 }),
        { credits: { default: 0.001 }, evidence: { PAGE: 1 } },
    );
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
