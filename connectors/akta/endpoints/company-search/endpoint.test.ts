import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("akta#company-search happy (recorded): free lookup — 0 credits, $0", async () => {
    const unit = await testSealedUnit("akta#v1/company/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "canva" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // FREE model (D25): nothing counted, no cost — the DOC's model says
    // "free"; the usage carries no flag
    assertEquals(result.usage, { counts: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
    assertEquals(
        (output.data as Record<string, string>[])[0].name,
        "Canva",
    );
});

Deno.test({
    name: "akta#company-search live (gated on AKTA_API_KEY)",
    ignore: liveSkip("akta"),
    fn: async () => {
        const unit = await testSealedUnit("akta#v1/company/search");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "canva" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { counts: {} });
    },
});
