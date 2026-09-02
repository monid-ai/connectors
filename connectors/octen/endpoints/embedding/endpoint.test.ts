import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#embedding happy (recorded): input tokens are the native unit", async () => {
    const unit = await testSealedUnit("octen#embedding");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { input: ["hello world"], model: "octen-embedding-0.6b" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.units, [{ amount: 3, unit: "token" }]);
    assertEquals(result.usage.evidence?.usage, { input_tokens: 3 });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
});

Deno.test({
    name: "octen#embedding live (gated on OCTEN_API_KEY)",
    ignore: liveSkip("octen"),
    fn: async () => {
        const unit = await testSealedUnit("octen#embedding");
        const result = await runEndpoint({
            unit,
            // pin a model: the vendor's server-side default (4b) has been
            // observed to 500 while 0.6b/8b work
            input: {
                body: {
                    input: ["hello world"],
                    model: "octen-embedding-0.6b",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.units[0]?.unit, "token");
    },
});
