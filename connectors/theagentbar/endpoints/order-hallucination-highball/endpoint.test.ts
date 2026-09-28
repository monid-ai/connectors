import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import {
    orderBody,
    orderFixture,
    orderRates,
    orderRun,
} from "../../testing.ts";

const slug = "hallucination-highball";
const id = `theagentbar#api/partners/monid/v1/drinks/${slug}`;
const fixtures = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`theagentbar ${slug}: estimate and fulfilled purchase settle exact vendor usage`, async () => {
    const unit = await testSealedUnit(id);
    const fixture = await orderFixture(slug);
    const input = { body: orderBody };
    const expectedUsage = {
        credits: { default: orderRates[slug].price },
        evidence: { CALL: 1 },
    };
    assertEquals(await estimateEndpoint(unit, input), expectedUsage);
    const endpoint = await loadEndpoint({
        unit,
        input,
        mode: "replay",
        fixture,
    });
    const result = await endpoint.start(input, orderRun);
    assertEquals(result.kind, "COMPLETED");
    if (result.kind !== "COMPLETED") {
        throw new Error("Expected synchronous completion");
    }
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, expectedUsage);
    const { billing: _billing, ...output } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, output);
});

Deno.test(`theagentbar ${slug}: vendor errors remain data with zero usage`, async () => {
    const unit = await testSealedUnit(id);
    for (
        const name of [
            "synthetic-order-conflict",
            "synthetic-partner-unavailable",
        ]
    ) {
        const fixture = await loadFixture(`${fixtures}${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: orderBody },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, fixture.calls[0].res.status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test(`theagentbar ${slug}: rejects invalid input before IO and accepts valid near-twins`, async () => {
    const unit = await testSealedUnit(id);
    for (
        const body of [
            { ...orderBody, order_nonce: "not-a-uuid" },
            { ...orderBody, message_kind: "unsupported" },
            { ...orderBody, price: 0 },
            { ...orderBody, message: "" },
        ]
    ) {
        const error = await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.INVALID_INPUT);
    }
    assertEquals(await estimateEndpoint(unit, { body: orderBody }), {
        credits: { default: orderRates[slug].price },
        evidence: { CALL: 1 },
    });
});

Deno.test({
    name: `theagentbar ${slug}: live purchase (explicit spending opt-in)`,
    // A live success publishes a public message and creates a vendor obligation.
    ignore: liveSkip("theagentbar") ||
        Deno.env.get("THEAGENTBAR_LIVE_PURCHASES") !== "true",
    fn: async () => {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            mode: "live",
            input: {
                body: {
                    ...orderBody,
                    order_nonce: crypto.randomUUID(),
                    agent_alias: "connector-check",
                    message: "Connector verification: one digital toast.",
                },
            },
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
        const output = result.output as Record<string, any>;
        assertEquals(output.status, "fulfilled");
        assertEquals(typeof output.experience.text, "string");
        assertEquals(typeof output.receipt.publicCode, "string");
        assert(!("billing" in output));
    },
});
