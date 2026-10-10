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
const INPUT = { metric: "volume30" };

Deno.test("trdefi#api/badge happy (recorded): free - zero usage, shields payload intact", async () => {
    const unit = await testSealedUnit("trdefi#api/badge");
    const fixture = await loadFixture(`${chains}badge-ok.json`);
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
    assertEquals(output.schemaVersion, 1);
});

Deno.test("trdefi#api/badge input gate: empty metric rejects, the near-twin passes", async () => {
    const unit = await testSealedUnit("trdefi#api/badge");
    const fixture = await loadFixture(`${chains}badge-ok.json`);
    await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { metric: "" } },
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

Deno.test("trdefi#api/badge provider error (synthetic): 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("trdefi#api/badge");
    const result = await runEndpoint({
        unit,
        input: { queryParams: INPUT },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-badge-error.json`),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "trdefi#api/badge live (keyless surface; gated on TRDEFI_CREDENTIALS_API_KEY)",
    ignore: liveSkip("trdefi"),
    fn: async () => {
        const unit = await testSealedUnit("trdefi#api/badge");
        const result = await runEndpoint({
            unit,
            input: { queryParams: INPUT },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
