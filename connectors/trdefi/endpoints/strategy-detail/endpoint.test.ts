import { assertRejects, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

// The hash recorded in strategy-detail-ok.json — replay matches URLs exactly.
const HASH =
    "0x20691ea20452e7b0b7311428ae9be4cf8ffefc890aa09a2c3bcc298198606d72";
const INPUT = { hash: HASH };

Deno.test("trdefi#api/strategy-detail happy (recorded): free - zero usage, the hash echoes back", async () => {
    const unit = await testSealedUnit("trdefi#api/strategy-detail");
    const fixture = await loadFixture(`${chains}strategy-detail-ok.json`);
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
    assertEquals(output.strategy_hash, HASH);
});

Deno.test("trdefi#api/strategy-detail input gate: empty hash rejects, the near-twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/strategy-detail");
    const fixture = await loadFixture(`${chains}strategy-detail-ok.json`);
    await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { hash: "" } },
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

Deno.test("trdefi#api/strategy-detail provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/strategy-detail");
    const result = await runEndpoint({
        unit,
        input: { queryParams: INPUT },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-strategy-detail-error.json`),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "trdefi#api/strategy-detail live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/strategy-detail");
        const result = await runEndpoint({
            unit,
            input: { queryParams: INPUT },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
