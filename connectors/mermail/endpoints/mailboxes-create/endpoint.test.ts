import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "mermail#mailboxes/create";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 10 credits`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { email: "agent@mermail.app", name: "Agent" } },
        mode: "replay",
        fixture: await loadFixture(
            `${FIXTURES}synthetic-mailboxes-create.json`,
        ),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.public_id, "mb_public_1");
    assertEquals(output.email, "agent@mermail.app");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { email: "agent@mermail.app", name: "Agent" } },
        mode: "replay",
        fixture: await loadFixture(
            `${FIXTURES}synthetic-mailboxes-create-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-mailboxes-create.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { name: "Agent" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        email: "agent@mermail.app",
                        name: "Agent",
                        label: "x",
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
