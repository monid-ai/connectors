import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "pieterpost#create-checkout-link";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        idempotencyKey: "checkout-synthetic-001",
        requestType: "letter" as const,
        letters: [{
            message: "Thanks for your order.",
            recipient: {
                name: "Pieter Example",
                streetAddress: "Damrak 1",
                postalCode: "1012 LG",
                city: "Amsterdam",
                country: "NL",
            },
        }],
        locale: "en" as const,
        paymentMethod: "auto" as const,
        returnUrl: "https://example.com/pieterpost-return",
        senderEmail: "sender@example.com",
    },
};

Deno.test(`${ID} happy: returns an unpaid checkout and stays free`, async () => {
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
    const output = result.output as Record<string, unknown>;
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(output.status, "checkout_open");
    assertEquals(output.recipientCount, 1);
    assertEquals(output.paidAt, null);
    assertEquals(output.fulfilledAt, null);
});

Deno.test({
    name:
        `${ID} live (gated on PIETERPOST_API_KEY): returns an order-shaped response`,
    ignore: liveSkip("pieterpost"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    ...INPUT.body,
                    idempotencyKey: "monid-live-checkout-contract-v1",
                },
            },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
        assertEquals(typeof result.output, "object");
    },
});

Deno.test(`${ID} provider error: address warning is zero-billed`, async () => {
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
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects mixed letter/postcard input before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        ...INPUT.body,
                        postcard: {
                            message: "Hello",
                            recipient: INPUT.body.letters[0].recipient,
                        },
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID} accepts documented templates, attachments, stamps, and postcard fronts`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    const recipient = INPUT.body.letters[0].recipient;
    const variants: Record<string, Json>[] = [
        {
            idempotencyKey: "checkout-template-001",
            requestType: "letter",
            composeMode: "template",
            letters: [{
                attachments: ["asset_letter_pdf_123"],
                recipient: {
                    ...recipient,
                    customFields: { gift_code: "SPRING-10" },
                },
            }],
            returnUrl: INPUT.body.returnUrl,
            senderEmail: INPUT.body.senderEmail,
            stampImageAssetId: "asset_stamp_123",
            templateMessage: "Hi {{first_name}}, code: {{gift_code}}.",
            useBusinessLogo: true,
            variableKeys: ["gift_code"],
        },
        {
            idempotencyKey: "checkout-postcard-001",
            requestType: "postcard",
            postcard: {
                composeMode: "template",
                frontImageAssetId: "asset_postcard_front_123",
                message: "Hello {{first_name}}.",
                recipients: [recipient],
                variableKeys: ["first_name"],
            },
            returnUrl: INPUT.body.returnUrl,
            senderEmail: INPUT.body.senderEmail,
        },
    ];
    for (const body of variants) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});
