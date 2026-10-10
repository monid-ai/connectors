import { assertRejects, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("trdefi: baseUrl+path resolve to the live urls; FREE synthesises empty quantities", async () => {
    const bundle = await testBundle();
    assertEquals(
        bundle.endpoints["trdefi#api/stats"].request.url,
        "https://yield.trdefi.com/api/stats",
    );
    assertEquals(
        bundle.endpoints["trdefi#api/quote"].request.url,
        "https://yield.trdefi.com/api/quote",
    );
    // FREE model (tinyfish D25/D27): no vendor meter - no consolidate fn
    // compiles, and both quantities slots share the synthesized empty entry.
    const stats = bundle.endpoints["trdefi#api/stats"];
    assertEquals(stats.usage.consolidate, undefined);
    const synthesizedKey = stats.usage.evidence.$fn.key;
    assertEquals(stats.usage.estimate.$fn.key, synthesizedKey);
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
});

Deno.test("trdefi#api/stats happy (recorded): free - zero usage, output is the fixture body", async () => {
    const unit = await testSealedUnit("trdefi#api/stats");
    const fixture = await loadFixture(`${chains}stats-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        result.output as unknown,
        fixture.calls[0].res.body as unknown,
    );
});

Deno.test("trdefi#api/stats input gate: an unknown query key rejects, the empty twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/stats");
    const fixture = await loadFixture(`${chains}stats-ok.json`);
    await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { bogus: 1 } },
            mode: "replay",
            fixture,
        })
    );
    const twin = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test("trdefi#api/stats provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/stats");
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-provider-error.json`),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "trdefi#api/stats live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/stats");
        const result = await runEndpoint({
            unit,
            input: { queryParams: {} },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
