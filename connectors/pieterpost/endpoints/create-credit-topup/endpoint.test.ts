import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "pieterpost#create-credit-topup";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        amountCents: 2500,
        idempotencyKey: "topup-synthetic-001",
        metadata: { source: "monid" },
        returnUrl: "https://example.com/topups/return",
    },
};

Deno.test(`${ID} happy: a test top-up credits the wallet and stays free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).status, "paid");
    assertEquals(
        fixture.calls[0].req.body &&
            "idempotencyKey" in
                (fixture.calls[0].req.body as Record<string, Json>),
        false,
    );
});

Deno.test(`${ID} provider error: iDEAL with USD is zero-billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                amountCents: 2500,
                currency: "usd",
                idempotencyKey: "topup-synthetic-002",
                paymentMethod: "ideal",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects a non-whole-euro amount before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...INPUT.body, amountCents: 2550 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
