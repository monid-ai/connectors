import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "mermail#mailboxes/{mailboxId}/emails/{emailId}/forward";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 5 credits`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { mailboxId: "mb_public_1", emailId: "em_1" },
            body: {
                "to": "ada@example.com",
                "from": "agent@mermail.app",
                "subject": "Hello",
                "text": "Hello from Mermail",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-forward.json`),
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "sent");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { mailboxId: "mb_public_1", emailId: "em_1" },
            body: {
                "to": "ada@example.com",
                "from": "agent@mermail.app",
                "subject": "Hello",
                "text": "Hello from Mermail",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-forward-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-forward.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { emailId: "em_1" },
                    body: {
                        "to": "ada@example.com",
                        "from": "agent@mermail.app",
                        "subject": "Hello",
                        "text": "Hello from Mermail",
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
