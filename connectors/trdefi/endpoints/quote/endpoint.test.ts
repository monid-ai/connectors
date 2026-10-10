import { assertRejects, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

// One canonical input per endpoint: replay matches the request URL exactly,
// so every non-gating run must issue the same query string.
const INPUT = {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
    chain: "ethereum",
    amount: "1000000",
    direction: "aToB",
};

Deno.test("trdefi#api/quote happy (synthetic): free - zero usage, output is the fixture body", async () => {
    const unit = await testSealedUnit("trdefi#api/quote");
    const fixture = await loadFixture(`${chains}synthetic-quote-ok.json`);
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
});

Deno.test("trdefi#api/quote input gate: empty amount rejects, the near-twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/quote");
    const fixture = await loadFixture(`${chains}synthetic-quote-ok.json`);
    await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { ...INPUT, amount: "" } },
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

Deno.test("trdefi#api/quote provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/quote");
    const result = await runEndpoint({
        unit,
        input: { queryParams: INPUT },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-quote-error.json`),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "trdefi#api/quote live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/quote");
        const result = await runEndpoint({
            unit,
            input: { queryParams: INPUT },
            mode: "live",
        });
        // Shape-only: a 422 here is coverage (gated / non-pair), not failure.
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
