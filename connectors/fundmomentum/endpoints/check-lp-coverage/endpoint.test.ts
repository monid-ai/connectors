import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/check_lp_coverage happy (real recording): FREE — zero usage even on a match, counts stay strings", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/check_lp_coverage");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { country: "Germany", lp_type: "Family office / Holding" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.matched, "<5");
    assertEquals(output.of_total_disclosed, 720);
});

Deno.test("fundmomentum#mcp/check_lp_coverage: both arguments optional", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/check_lp_coverage");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
});
