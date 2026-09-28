import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixtures = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const id = "theagentbar#api/receipts/{code}";

Deno.test("theagentbar receipt: verifies without re-billing the original purchase", async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixtures}synthetic-receipt-verified.json`,
    );
    const input = { pathParams: { code: "tab_fixture_receipt" } };
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(await estimateEndpoint(unit, input), {
        credits: {},
        evidence: {},
    });
});

for (
    const scenario of [
        {
            file: "receipt-missing.json",
            code: "tab_monid_missing_receipt",
            status: 404,
        },
        {
            file: "synthetic-receipt-invalid.json",
            code: "tab_fixture_receipt",
            status: 409,
        },
    ]
) {
    Deno.test(`theagentbar receipt: preserves ${scenario.status} and verified=false`, async () => {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(fixtures + scenario.file);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { code: scenario.code } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, scenario.status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}

Deno.test("theagentbar receipt: rejects missing or empty code before any upstream call", async () => {
    const unit = await testSealedUnit(id);
    assertEquals(
        await estimateEndpoint(unit, {
            pathParams: { code: "tab_fixture_receipt" },
        }),
        { credits: {}, evidence: {} },
    );
    const invalidInputs: RunInput[] = [{}, { pathParams: {} }, {
        pathParams: { code: "" },
    }];
    for (const input of invalidInputs) {
        const error = await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay" }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.INVALID_INPUT);
    }
});

Deno.test({
    name: "theagentbar receipt: live missing receipt (read-only)",
    ignore: liveSkip("theagentbar"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: { pathParams: { code: "tab_monid_missing_receipt" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            (result.output as Record<string, unknown>).verified,
            false,
        );
    },
});
