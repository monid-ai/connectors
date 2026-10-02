import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "mermail#mailboxes/{mailboxId}/emails";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-emails.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    const emails = output.emails as Array<Record<string, unknown>>;
    assertEquals(output.totalCount, 1);
    assertEquals(emails[0].id, "em_1");
    assertEquals(emails[0].scan_status, "clean");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { mailboxId: "mb_public_1" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-emails-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-emails.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { mailboxId: "mb_public_1" },
                    queryParams: { pageSize: 10 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
