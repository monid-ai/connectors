import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#search happy (synthetic): call + gated token tier, meter absorbed", async () => {
    const unit = await testSealedUnit("octen#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "deno 2 release",
                count: 2,
                full_content: { enable: true },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // TWO native measures: the call + the gated full-content tokens
    assertEquals(result.usage.units, [
        { amount: 1, unit: "call" },
        { amount: 3210, unit: "token" },
    ]);
    assertEquals(result.usage.evidence?.usage, {
        num_search_queries: 1,
        full_content_tokens: 3210,
    });
    // the meter block is billing info — absorbed into usage
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
    assertEquals((output.results as unknown as unknown[]).length, 2);
});

Deno.test("octen#search: non-ISO start_time/end_time rejected before the wire", async () => {
    const unit = await testSealedUnit("octen#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    // z.iso.datetime({offset:true}) compiles to a date-time pattern — bad
    // values become INVALID_INPUT instead of a provider-side failure
    for (
        const start_time of ["last week", "2025-01-01", "2025-02-30T00:00:00Z"]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { query: "deno", start_time } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: "octen#search live (gated on OCTEN_API_KEY)",
    ignore: liveSkip("octen"),
    fn: async () => {
        const unit = await testSealedUnit("octen#search");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno 2 release notes", count: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.units[0], { amount: 1, unit: "call" });
    },
});
