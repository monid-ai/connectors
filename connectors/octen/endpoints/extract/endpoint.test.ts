import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#extract happy (recorded): bills SUCCESSFUL urls only", async () => {
    const unit = await testSealedUnit("octen#extract");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { urls: ["https://deno.com/blog/v2"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    assertEquals(result.usage.evidence?.usage, {
        total_urls: 1,
        successful_urls: 1,
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
});

Deno.test("octen#extract empty (recorded): failed url bills ZERO — money follows evidence", async () => {
    const unit = await testSealedUnit("octen#extract");
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { urls: ["notaurl"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 1 url sent, 0 succeeded — the receipt, not the request, is billed
    assertEquals(result.usage.units, [{ amount: 0, unit: "result" }]);
    assertEquals(result.usage.evidence?.usage, {
        total_urls: 1,
        successful_urls: 0,
    });
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
