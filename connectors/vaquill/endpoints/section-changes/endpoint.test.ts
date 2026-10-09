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

const ID = "vaquill#us/statutes/section/{act_id}/changes";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { act_id: "USC_T26_C1_S1" },
    queryParams: { limit: 3 },
};

Deno.test(`${ID} happy: 1 credit for a page with an observed change`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}changes-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assertEquals((output.changes as unknown[]).length, 1);
});

Deno.test(`${ID} empty page: the vendor charges the poll, the caller pays nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { act_id: "USC_T42_C21_S1983" },
            queryParams: { limit: 3 },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}changes-empty-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // `creditsConsumed: 1` in the fixture is declined; the fold counts 0
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const output = result.output as Record<string, Json>;
    assertEquals((output.changes as unknown[]).length, 0);
    assertEquals("creditsConsumed" in output, false);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { act_id: "USC_T42_C21_S1983" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-changes.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: changeKind takes the vendor's three kinds, not a section status`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}changes-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { act_id: "USC_T42_C21_S1983" },
                    queryParams: { changeKind: ["repealed"] },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: two real kinds are accepted, and travel as a repeated query key. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            pathParams: { act_id: "USC_T42_C21_S1983" },
            queryParams: { changeKind: ["amended", "removed"] },
        }),
        { credits: { default: 1 }, evidence: { RESULT: 1 } },
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
                pathParams: { act_id: "USC_T42_C21_S1983" },
                queryParams: { limit: 3 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts. A page with nothing observed is FREE, so
        // there may be no pool entry at all: assert the answered-page
        // quantity, and let each branch say what settles.
        const answered = result.usage.evidence.RESULT;
        assert(
            answered === 0 || answered === 1,
            `answered pages must be 0 or 1, got ${answered}`,
        );
        if (answered === 1) {
            assertEquals(typeof result.usage.credits.default, "number");
        } else {
            assertEquals(result.usage.credits, {});
        }
        assert(
            (result.output as Record<string, Json>).changes !== undefined,
        );
    },
});
