import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "mermail#mailboxes/{mailboxId}/emails/{emailId}/context";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1", emailId: "em_1" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-email-context.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    const thread = output.thread as Record<string, unknown>;
    assertEquals(thread.id, "th_1");
    assertEquals(thread.has_more, false);
    assertEquals((output.email as Record<string, unknown>).id, "em_1");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1", emailId: "em_1" } },
        mode: "replay",
        fixture: await loadFixture(
            `${FIXTURES}synthetic-email-context-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-email-context.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { mailboxId: "mb_public_1", emailId: "em_1" },
                    queryParams: { limit: 0 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
