import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("tinyfish#fetch happy (synthetic): free — one call unit for the batch", async () => {
    const unit = await testSealedUnit("tinyfish#fetch");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { urls: ["https://example.com/pricing"], format: "markdown" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.units, [{ amount: 1, unit: "call" }]);
    const output = result.output as Record<string, unknown>;
    assertEquals((output.errors as unknown[]).length, 0);
});

Deno.test({
    name: "tinyfish#fetch live (gated on TINYFISH_API_KEY)",
    ignore: liveSkip("tinyfish"),
    fn: async () => {
        const unit = await testSealedUnit("tinyfish#fetch");
        const result = await runEndpoint({
            unit,
            input: {
                body: { urls: ["https://example.com"], format: "markdown" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(
            Array.isArray((result.output as Record<string, unknown>).results),
            "results array present",
        );
    },
});
