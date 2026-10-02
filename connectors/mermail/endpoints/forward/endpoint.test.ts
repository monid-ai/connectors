import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

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
            throw new Error("live forward needs one mailbox on the API key");
        }
        const emails = await runEndpoint({
            unit: await testSealedUnit("mermail#mailboxes/{mailboxId}/emails"),
            input: {
                pathParams: { mailboxId },
                queryParams: { limit: 1 },
            },
            mode: "live",
        });
        const emailId = (emails.output as { emails?: Array<{ id?: unknown }> })
            .emails?.[0]?.id;
        if (typeof emailId !== "string") {
            throw new Error("live forward needs one message in the mailbox");
        }
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                pathParams: { mailboxId, emailId },
                body: {
                    to: from,
                    from,
                    subject: "Monid live forward",
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
