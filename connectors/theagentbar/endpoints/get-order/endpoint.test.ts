import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { orderBody } from "../../testing.ts";
const id = "theagentbar#api/partners/monid/v1/orders/{nonce}";
const input = { pathParams: { nonce: orderBody.order_nonce } };
const fixtures = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("theagentbar get-order: historical billing stays readable and does not become a new charge", async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixtures}synthetic-order-recovered.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(await estimateEndpoint(unit, input), {
        credits: {},
        evidence: {},
    });
});

Deno.test("theagentbar get-order: missing order returns error data with no usage", async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixtures}synthetic-order-missing.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("theagentbar get-order: invalid UUID fails before IO, valid UUID clears the gate", async () => {
    const unit = await testSealedUnit(id);
    const error = await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { nonce: "invalid" } },
                mode: "replay",
            }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.INVALID_INPUT);
    assertEquals(await estimateEndpoint(unit, input), {
        credits: {},
        evidence: {},
    });
});

Deno.test({
    name: "theagentbar get-order: live missing-order lookup (read-only)",
    ignore: liveSkip("theagentbar"),
    fn: async () => {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { nonce: crypto.randomUUID() } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            (result.output as Record<string, unknown>).error,
            "order_not_found",
        );
    },
});
