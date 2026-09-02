import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#extract happy (synthetic): bills SUCCESSFUL urls only", async () => {
    const unit = await testSealedUnit("octen#extract");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                urls: ["https://example.com/a", "https://example.com/broken"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // 2 urls sent, 1 succeeded — money follows evidence
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    assertEquals(result.usage.evidence?.usage, {
        successful_urls: 1,
        total_urls: 2,
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
});

Deno.test({
    name: "octen#extract live (gated on OCTEN_API_KEY)",
    ignore: liveSkip("octen"),
    fn: async () => {
        const unit = await testSealedUnit("octen#extract");
        const result = await runEndpoint({
            unit,
            input: { body: { urls: ["https://example.com"] } },
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
