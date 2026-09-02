import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#broad-search happy (recorded): receipt queries are the result units", async () => {
    const unit = await testSealedUnit("octen#broad-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "deno 2 release notes", max_queries: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // settled on the RECEIPT's num_search_queries (2), not the request's
    // max_queries fallback; the token tier reports 0 (present in receipt)
    assertEquals(result.usage.units, [
        { amount: 2, unit: "result" },
        { amount: 0, unit: "token" },
    ]);
    assertEquals(result.usage.evidence?.usage, {
        num_search_queries: 2,
        full_content_tokens: 0,
        full_content_extra_count: 0,
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
    // real envelope: the fan-out lives under data
    const data = output.data as Record<string, unknown>;
    assertEquals(Array.isArray(data.queries), true);
});

Deno.test({
    name: "octen#broad-search live (gated on OCTEN_API_KEY)",
    ignore: liveSkip("octen"),
    fn: async () => {
        const unit = await testSealedUnit("octen#broad-search");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno 2 release notes", max_queries: 2 } },
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
