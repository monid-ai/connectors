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
    assertEquals(result.usage.counts, { "RESULT": 1 });
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
    assertEquals(result.usage.counts, {});
});

Deno.test("interning: search and contents share auth; settle fns DIVERGED with the re-model", async () => {
    const bundle = await testBundle();
    const search = bundle.endpoints["exa#search"];
    const contents = bundle.endpoints["exa#contents"];
    // the settle fns were byte-identical (one interned entry) until the
    // search re-model (design D19: base-plus-overage offset counting) —
    // now each carries its own content-addressed entry
    assert(
        search.usage.consolidate.$fn.key !==
            contents.usage.consolidate.$fn.key,
    );
    // both still share the provider auth fn (content addressing at work)
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
        assertEquals(Object.keys(result.usage.counts), ["RESULT"]);
    },
});
