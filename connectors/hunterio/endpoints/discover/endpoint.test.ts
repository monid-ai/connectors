import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "hunterio#discover";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { organization: { domain: ["hunter.io"] } } };

Deno.test(`${ID} happy (synthetic): free`, async () => {
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
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
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
            input: { body: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { limit: 10 },
            { headcount: ["1-5"] },
            { organization: { domain: ["hunter.io"] }, query: "software" },
            { organization: { domain: ["hunter.io"] }, offset: 10001 },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and replays the happy chain (a
        // body field does not change the wire URL)
        const twin = await run({
            headquarters_location: {
                include: [{ continent: "Europe" }],
                exclude: [{ country: "BE" }],
            },
            technology: { include: ["php"], match: "any" },
            limit: 50,
        });
        assertEquals(twin.httpStatus, 200);
    }
});

Deno.test({
    name: `${ID} live (gated on HUNTERIO_API_KEY)`,
    ignore: liveSkip("hunterio"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
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
