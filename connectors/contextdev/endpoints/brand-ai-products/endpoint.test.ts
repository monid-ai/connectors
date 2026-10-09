import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#brand/ai/products";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { domain: "shop.example.com", maxProducts: 2 } };

Deno.test(`${ID} happy (synthetic): ten credits however many products`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CALL: 1 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
    assertEquals((result.output as { products: unknown[] }).products.length, 2);
});

Deno.test(`${ID} provider error (synthetic 408): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 408);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: a domain or a directUrl, not both; the body is strict`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (body: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: body as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { maxProducts: 2 },
            {
                domain: "shop.example.com",
                directUrl: "https://shop.example.com",
            },
            { domain: "shop.example.com", maxProducts: 13 },
            { directUrl: "shop.example.com/catalog" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a POST
    // body does not change the wire URL)
    const twin = await run({
        directUrl: "https://shop.example.com/catalog",
        maxProducts: 12,
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test({
    name: `${ID} live (gated on CONTEXTDEV_API_KEY)`,
    ignore: liveSkip("contextdev"),
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
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).products),
            true,
            JSON.stringify(result.output),
        );
    },
});
