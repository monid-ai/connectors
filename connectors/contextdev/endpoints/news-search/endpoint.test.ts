import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#news/search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        searchBy: {
            type: "entity",
            entity: { type: "domain", domain: "stripe.com" },
        },
        limit: 10,
    },
};

Deno.test(`${ID} happy (synthetic): three articles bill one block of ten`, async () => {
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
        credits: { default: 1 },
        evidence: { RESULT: 3 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} empty (synthetic): no articles, no charge`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID}: a 200 without data fails instead of settling zero`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    delete (fixture.calls[0].res.body as Record<string, Json>).data;
    await assertRejects(
        () => runEndpoint({ unit, input: INPUT, mode: "replay", fixture }),
        Error,
        "$.data",
    );
});

Deno.test(`${ID} provider error (synthetic 404 unresolved company): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: limit is required; the entity is one typed key; filters are bounded`, async () => {
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
            { searchBy: INPUT.body.searchBy },
            { ...INPUT.body, limit: 101 },
            {
                searchBy: {
                    type: "entity",
                    entity: { type: "isin", isin: "US037833100" },
                },
                limit: 10,
            },
            {
                searchBy: {
                    type: "entity",
                    entity: {
                        type: "domain",
                        domain: "stripe.com",
                        name: "Stripe",
                    },
                },
                limit: 10,
            },
            { ...INPUT.body, filterBy: { sourceDomain: ["a", "b", "c", "d"] } },
            { ...INPUT.body, sortBy: { type: "oldest" } },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a POST
    // body does not change the wire URL)
    const twin = await run({
        searchBy: {
            type: "entity",
            entity: { type: "ticker", ticker: "AAPL", exchange: "NASDAQ" },
        },
        filterBy: { articleType: ["editorial"], sourceCountry: ["us"] },
        sortBy: { type: "relevance" },
        limit: 100,
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
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).data),
            true,
            JSON.stringify(result.output),
        );
    },
});
