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

const ID = "vaquill#us/statutes/section/{act_id}/body";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { act_id: "USC_T42_C21_S1983" },
    queryParams: { format: "plain" },
};

Deno.test(`${ID} happy: 6 credits whatever the length`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}body-ok.json`),
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
    assertEquals(output.actId, "USC_T42_C21_S1983");
    assert(typeof output.plain === "string");
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { act_id: "USC_T42_C21_S1983" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-body.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: a format the vendor does not publish is refused`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}body-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { act_id: "USC_T42_C21_S1983" },
                    queryParams: { format: "markdown" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: `operative` is a real format and is accepted; `structured` is the knob that adds markdown. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            pathParams: { act_id: "USC_T42_C21_S1983" },
            queryParams: { format: "operative" },
        }),
        { credits: { default: 6 }, evidence: { RESULT: 1 } },
    );
});

Deno.test(`${ID} out of coverage: no text served, so the caller pays nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { act_id: "USC_T28_C85_S1343" },
            queryParams: { asOf: "1901-01-01" },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}body-unavailable-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the vendor charged 6 for the attempt (`creditsConsumed: 6` in the
    // fixture); that claim is declined, and the fold counts 0 texts served
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const output = result.output as Record<string, Json>;
    assertEquals(output.available, false);
    assertEquals(output.plain, null);
    assertEquals("creditsConsumed" in output, false);
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
                queryParams: { format: "plain" },
            },
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
            typeof (result.output as Record<string, Json>).plain === "string",
        );
    },
});
