import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "pieterpost#get-wallet";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: defaults to EUR and returns account capabilities`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.approvedForDirectSend, true);
});

Deno.test(`${ID} provider error: invalid credentials are zero-billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects an unsupported currency before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { currency: "gbp" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
