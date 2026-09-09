import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#search happy (recorded): call + gated token tier, meter absorbed", async () => {
    const unit = await testSealedUnit("octen#search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
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
    // metered tokens + the engine-appended flat call (complete vector,
    // D24/D26), folded through the doc's own card: 1 credit flat +
    // ceil(4112 / 1000) = 5 token credits. The vendor's meta.usage meter
    // block stays in the RAW run record, never in usage.
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { full_content_tokens: 4112, call: 1 },
    });
    // the meter block is billing info — absorbed out of the payload
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
    // real envelope: results live under data
    const data = output.data as Record<string, unknown>;
    assertEquals((data.results as unknown[]).length, 2);
});

Deno.test("octen#search provider error (recorded 401): zero usage", async () => {
    const unit = await testSealedUnit("octen#search");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "deno" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("octen#search: non-ISO start_time/end_time rejected before the wire", async () => {
    const unit = await testSealedUnit("octen#search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
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
        // no full-content in the live probe: no token receipt, nothing
        // metered — the flat call still bills its 1 credit
        // (engine-appended complete vector, D24/D26)
        assertEquals(result.usage, {
            credits: { default: 1 },
            evidence: { call: 1 },
        });
    },
});
