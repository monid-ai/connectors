import { assertRejects, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("trdefi#api/chains happy (recorded): free - zero usage, output is the fixture body", async () => {
    const unit = await testSealedUnit("trdefi#api/chains");
    const fixture = await loadFixture(`${chains}chains-ok.json`);
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
    const output = result.output as Record<string, unknown>;
    assertEquals(Array.isArray(output.chains), true);
});

Deno.test("trdefi#api/chains input gate: an unknown query key rejects, the empty twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/chains");
    const fixture = await loadFixture(`${chains}chains-ok.json`);
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

Deno.test("trdefi#api/chains provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/chains");
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
    name: "trdefi#api/chains live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/chains");
        const result = await runEndpoint({
            unit,
            input: { queryParams: {} },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
