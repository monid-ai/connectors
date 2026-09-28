import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "pieterpost#create-direct-order";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        idempotencyKey: "direct-order-synthetic-001",
        requestType: "letter" as const,
        letters: [{
            message: "A direct letter from Monid.",
            recipient: {
                name: "Pieter Example",
                streetAddress: "Damrak 1",
                postalCode: "1012 LG",
                city: "Amsterdam",
                country: "NL",
            },
        }],
        locale: "en" as const,
        senderEmail: "sender@example.com",
    },
};

Deno.test(`${ID} happy: a test-key direct order completes and stays free`, async () => {
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
    assertEquals(
        (result.output as Record<string, unknown>).status,
        "fulfilled",
    );
    assertEquals(
        fixture.calls[0].req.body &&
            "idempotencyKey" in
                (fixture.calls[0].req.body as Record<string, Json>),
        false,
    );
});

Deno.test(`${ID} provider error: insufficient credits are zero-billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects a direct order without an idempotency key`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    const { idempotencyKey: _, ...body } = INPUT.body;
    await assertRejects(
        () => runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
        Error,
        "INVALID_INPUT",
    );
});
