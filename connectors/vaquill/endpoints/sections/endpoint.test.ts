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

const ID = "vaquill#us/statutes/sections";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = { body: { actIds: ["USC_T42_C21_S1983", "USC_T99_C99_S9999"] } };

Deno.test(`${ID} happy: an id that resolves to nothing is refunded, so two asked bills one`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}sections-partial-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { section: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assertEquals((output.sections as unknown[]).length, 1);
    assertEquals(output.notFound, ["USC_T99_C99_S9999"]);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-sections.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: an empty actIds is refused: there is nothing to look up`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}sections-partial-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { actIds: [] } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: one id is accepted. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            body: { actIds: ["USC_T42_C21_S1983"] },
        }),
        { credits: { default: 2 }, evidence: { section: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { actIds: ["USC_T42_C21_S1983"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the corpus moves, so pin the pool settled
        // rather than a figure
        assertEquals(typeof result.usage.credits.default, "number");
        assert(
            ((result.output as Record<string, Json>).sections as unknown[])
                .length > 0,
            "the section must come back",
        );
    },
});

Deno.test(`${ID} estimate counts DISTINCT actIds, because the vendor collapses duplicates before pricing`, async () => {
    const unit = await testSealedUnit(ID);
    // verified live: three copies of one actId return count 1 and bill 2
    assertEquals(
        await estimateEndpoint(unit, {
            body: {
                actIds: [
                    "USC_T42_C21_S1983",
                    "USC_T42_C21_S1983",
                    "USC_T42_C21_S1983",
                ],
            },
        }),
        { credits: { default: 2 }, evidence: { section: 1 } },
    );
    // the body line rides the same distinct count
    assertEquals(
        await estimateEndpoint(unit, {
            body: {
                actIds: ["USC_T42_C21_S1983", "USC_T42_C21_S1983"],
                includeBody: true,
            },
        }),
        { credits: { default: 8 }, evidence: { section: 1, body: 1 } },
    );
});
