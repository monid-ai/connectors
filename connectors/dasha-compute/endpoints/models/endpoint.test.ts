import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("dasha-compute#models happy (synthetic): free — zero usage, live list rides through", async () => {
    const unit = await testSealedUnit("dasha-compute#models");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing folds, nothing is evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.object, "list");
    const data = output.data as Record<string, unknown>[];
    assertEquals(data.length, 1);
    assertEquals(data[0].id, "qwen3-32b");
    assertEquals(data[0].providers_online, 1);
});

Deno.test("dasha-compute#models provider error: 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("dasha-compute#models");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "dasha-compute#models live",
    ignore: liveSkip("dasha-compute"),
    fn: async () => {
        const unit = await testSealedUnit("dasha-compute#models");
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
