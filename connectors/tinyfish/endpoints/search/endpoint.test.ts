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
    // free provider: both endpoints share the provider-level perCall settle fn
    assertEquals(
        bundle.endpoints["tinyfish#search"].usage.consolidate.$fn.key,
        bundle.endpoints["tinyfish#fetch"].usage.consolidate.$fn.key,
    );
});

Deno.test("tinyfish#search happy (synthetic): free — one call unit, no cost", async () => {
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
    assertEquals(result.usage.units, [{ amount: 1, unit: "call" }]);
    assertEquals(result.usage.cost, undefined);
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
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
        assertEquals(result.usage.units, [{ amount: 1, unit: "call" }]);
        assert(
            Array.isArray((result.output as Record<string, unknown>).results),
            "results array present",
        );
    },
});
