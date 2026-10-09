import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "hunterio#people/find";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { email: "jane.doe@example.com" } };
/** The live call needs an address Hunter resolves (an unknown one answers
 *  404): the vendor docs' own example (hunter.io/api-documentation/v2). */
const LIVE_INPUT = { queryParams: { email: "matt@hunter.io" } };

Deno.test(`${ID} happy (synthetic): a hit: 0.2 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.2 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} a partial profile (synthetic): a 200 missing a core data point is free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-partial.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} a miss: 404, error-as-data, zero usage (synthetic 404)`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error_code: string }).error_code,
        "not_found",
    );
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string; error_code: string };
    assertEquals(output.error_code, "invalid_api_key");
    assertEquals(output.message, "The API key is invalid.");
});

Deno.test(`${ID}: the schema gate — the vendor's rules and strictness`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (input: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { email: "not-an-email" },
            { email: "jane.doe@example.com", clearbit_format: true },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and fails later, at replay URL
        // matching — proving validation let it through
        const err = await assertRejects(
            () => run({ linkedin_handle: "janedoe" }),
            Error,
        );
        assertEquals(err.message.includes("INVALID_INPUT"), false, err.message);
    }
});

Deno.test({
    name: `${ID} live (gated on HUNTERIO_API_KEY)`,
    ignore: liveSkip("hunterio"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: LIVE_INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
    },
});
