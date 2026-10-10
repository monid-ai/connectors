import { assertRejects, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

// One canonical input per endpoint: replay matches the request URL exactly.
const INPUT = { pair: "1INCH/USDC", limit: 2 };

Deno.test("trdefi#api/strategies happy (recorded): free - zero usage, pairs match the request", async () => {
    const unit = await testSealedUnit("trdefi#api/strategies");
    const fixture = await loadFixture(`${chains}strategies-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: INPUT },
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
    const output = result.output as Record<string, unknown>;
    const rows = output.strategies as Array<Record<string, unknown>>;
    assertEquals(rows.length, 2);
    for (const row of rows) assertEquals(row.pair, "1INCH/USDC");
});

Deno.test("trdefi#api/strategies input gate: limit 0 rejects, the near-twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/strategies");
    const fixture = await loadFixture(`${chains}strategies-ok.json`);
    await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { ...INPUT, limit: 0 } },
            mode: "replay",
            fixture,
        })
    );
    const twin = await runEndpoint({
        unit,
        input: { queryParams: { ...INPUT } },
        mode: "replay",
        fixture,
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test("trdefi#api/strategies provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/strategies");
    const result = await runEndpoint({
        unit,
        input: { queryParams: INPUT },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-strategies-error.json`),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "trdefi#api/strategies live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/strategies");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { limit: 2 } },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
