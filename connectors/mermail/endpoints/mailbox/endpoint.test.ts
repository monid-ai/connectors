import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "mermail#mailboxes/{mailboxId}";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-mailbox.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.public_id, "mb_public_1");
    assertEquals(output.receiving_status, "ready");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-mailbox-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-mailbox.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { mailboxId: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
