import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "vaquill#us/statutes/section/{act_id}/cross-state";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { act_id: "STATE_CA_Cciv_D3_P4_T5_C2_S1950.7" },
    queryParams: { limit: 3 },
};

Deno.test(`${ID} happy: one answered comparison, whatever the number of states`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}cross-state-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { RESULT: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assertEquals((output.neighbors as unknown[]).length, 2);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { act_id: "USC_T42_C21_S1983" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-cross-state.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: limit above the vendor's 25 states is refused`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}cross-state-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { act_id: "USC_T42_C21_S1983" },
                    queryParams: { limit: 26 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: 25 is accepted. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            pathParams: { act_id: "USC_T42_C21_S1983" },
            queryParams: { limit: 25 },
        }),
        { credits: { default: 6 }, evidence: { RESULT: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { act_id: "STATE_CA_Cciv_D3_P4_T5_C2_S1950.7" },
                queryParams: { limit: 3 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts. A live lookup that finds nothing is
        // REFUNDED, so there may be no pool entry at all: assert the
        // answered-lookup quantity, and let each branch say what settles.
        const answered = result.usage.evidence.RESULT;
        assert(
            answered === 0 || answered === 1,
            `answered lookups must be 0 or 1, got ${answered}`,
        );
        if (answered === 1) {
            assertEquals(typeof result.usage.credits.default, "number");
        } else {
            assertEquals(result.usage.credits, {});
        }
        assert(
            (result.output as Record<string, Json>).neighbors !== undefined,
        );
    },
});
