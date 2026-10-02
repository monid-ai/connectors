import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mermail#mailboxes";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-mailboxes.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const rows = result.output as Array<Record<string, unknown>>;
    assertEquals(rows.length, 1);
    assertEquals(rows[0].public_id, "mb_public_1");
    assertEquals(rows[0].email, "agent@mermail.app");
});

Deno.test(`${ID} provider error: zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-mailboxes-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a bad input`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-mailboxes.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { workspace: "nope" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // Optional workspaceId is accepted. Estimate is pure, so the query
    // string does not need its own fixture.
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { workspaceId: "ws_1" },
        }),
        { credits: { default: 1 }, evidence: { CALL: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on MERMAIL_API_KEY)`,
    ignore: liveSkip("mermail"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Array.isArray(result.output), true);
    },
});
