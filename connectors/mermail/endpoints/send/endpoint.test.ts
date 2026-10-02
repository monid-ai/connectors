import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mermail#mailboxes/{mailboxId}/emails/send";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 5 credits`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { mailboxId: "mb_public_1" },
            body: {
                "to": "ada@example.com",
                "from": "agent@mermail.app",
                "subject": "Hello",
                "text": "Hello from Mermail",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-send.json`),
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.id, "em_sent");
    assertEquals(output.status, "sent");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { mailboxId: "mb_public_1" },
            body: {
                "to": "ada@example.com",
                "from": "agent@mermail.app",
                "subject": "Hello",
                "text": "Hello from Mermail",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-send-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-send.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { mailboxId: "mb_public_1" },
                    body: {
                        from: "agent@mermail.app",
                        subject: "Hello",
                        text: "Hi",
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on MERMAIL_API_KEY)`,
    ignore: liveSkip("mermail"),
    fn: async () => {
        const listed = await runEndpoint({
            unit: await testSealedUnit("mermail#mailboxes"),
            input: {},
            mode: "live",
        });
        const mailbox = (listed.output as Array<Record<string, unknown>>)[0];
        const mailboxId = mailbox?.public_id;
        const from = mailbox?.email;
        if (typeof mailboxId !== "string" || typeof from !== "string") {
            throw new Error("live send needs one mailbox on the API key");
        }
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                pathParams: { mailboxId },
                body: {
                    to: from,
                    from,
                    subject: "Monid live send",
                    text: "Shape check only.",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.id, "string");
        assertEquals(typeof output.status, "string");
    },
});
