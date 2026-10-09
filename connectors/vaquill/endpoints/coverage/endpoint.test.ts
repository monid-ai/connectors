import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "vaquill#us/statutes/coverage";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: free, and the one response with no meter to read`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}coverage-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the fixture really does carry no receipt, so this is the ABSENT-claim
    // path rather than a zero one: the provider consolidate omits the entry
    // and the FREE model settles the run
    const body = result.output as Record<string, Json>;
    assertEquals("creditsConsumed" in body, false);
    assert(body.data !== undefined);
    // `pluck` is EXACT, so the receipt this endpoint reports under `meta` is
    // untouched. That is deliberate: it is documented response data saying
    // the call was free, not the root receipt the provider settles on.
    assertEquals((body.meta as Record<string, Json>).creditsConsumed, 0);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-get.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

/**
 * No schema gate here, and that is the behaviour worth pinning rather than
 * an omission: coverage takes no parameters at all, so the doc declares no
 * input schema and there is nothing for a gate to reject. Every other
 * vaquill endpoint carries one.
 */
Deno.test(`${ID} takes no input, so it declares no input schema`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.body, undefined);
    assertEquals(unit.doc.input.schema.queryParams, undefined);
    assertEquals(unit.doc.input.schema.pathParams, undefined);
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // free stays free: nothing may settle against the pool
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert((result.output as Record<string, Json>).data !== undefined);
    },
});
