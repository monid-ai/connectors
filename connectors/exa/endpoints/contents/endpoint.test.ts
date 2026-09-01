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

Deno.test("exa#contents happy: per-result usage + usd cost", async () => {
    const unit = await testSealedUnit("exa#contents");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                urls: ["https://example.com/solid-state-2026"],
                text: true,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 1_000,
        unit: "MICRO_DOLLAR",
    });
    // usage.consolidate absorbed the vendor billing field into usage
    assert(!("costDollars" in (result.output as Record<string, unknown>)));
});

Deno.test("exa#contents provider error: zero usage", async () => {
    const unit = await testSealedUnit("exa#contents");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { urls: ["https://example.com/x"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
});

Deno.test("interning: search and contents share the settle fn + auth entries", async () => {
    const bundle = await testBundle();
    const search = bundle.endpoints["exa#search"];
    const contents = bundle.endpoints["exa#contents"];
    // byte-identical ad-hoc settle fns → ONE fnTable entry
    assertEquals(
        search.usage.consolidate.$fn.key,
        contents.usage.consolidate.$fn.key,
    );
    // and both share the provider auth fn
    assertEquals(search.auth.inject.$fn.key, contents.auth.inject.$fn.key);
});

Deno.test({
    name: "exa#contents live (gated on EXA_API_KEY)",
    ignore: liveSkip("exa"),
    fn: async () => {
        const unit = await testSealedUnit("exa#contents");
        const result = await runEndpoint({
            unit,
            input: { body: { urls: ["https://exa.ai"], text: true } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.units[0]?.unit, "result");
    },
});
