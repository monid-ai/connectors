import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "hunterio#domain-search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { domain: "intercom.com", limit: 25 } };

Deno.test(`${ID} happy (synthetic): twelve addresses on a 25-address page: ceil(12/10) = 2 credits`, async () => {
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
        credits: { default: 2 },
        evidence: { RESULT: 12 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} no addresses: zero credits (synthetic)`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
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
            { limit: 25 },
            { domain: "intercom.com" },
            { domain: "intercom.com", limit: 0 },
            { domain: "intercom.com", limit: 101 },
            { domain: "intercom.com", limit: 25, seniority: "" },
            { company: "ab", limit: 25 },
            { domain: "intercom.com", limit: 25, page: 2 },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and replays the happy chain (a
        // body field does not change the wire URL)
        const twin = await run({
            company: "Intercom",
            limit: 25,
            location: { include: [{ country: "US" }] },
            aggregations: true,
        });
        assertEquals(twin.httpStatus, 200);
    }
});

const estimateFor = async (body: RunInput["body"]) => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    }).load(await testSealedUnit(ID));
    return loaded.estimate({ body });
};

Deno.test(`${ID}: the estimate holds the input's worst case`, async () => {
    assertEquals(await estimateFor({ domain: "intercom.com", limit: 25 }), {
        credits: { default: 3 },
        evidence: { RESULT: 25 },
    });
    assertEquals(await estimateFor({ domain: "intercom.com", limit: 10 }), {
        credits: { default: 1 },
        evidence: { RESULT: 10 },
    });
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
