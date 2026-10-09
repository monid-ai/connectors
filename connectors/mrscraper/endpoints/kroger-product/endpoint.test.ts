import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mrscraper#kroger/product";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: { "url": "https://www.kroger.com/p/chicken-breasts/0027061550000" },
};

Deno.test(`${ID} happy (synthetic): 10 tokens, the caller gets the inner data`, async () => {
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
        evidence: { RESULT: 1 },
    });
    assertEquals(
        result.output,
        (fixture.calls[0].res.body as { data: Json }).data,
    );
});

Deno.test(`${ID} provider error (synthetic 500): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: only this site's URL passes the gate; the body is strict`, async () => {
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
            { "url": "https://www.kroger.com/search?query=chicken" },
            {
                "url":
                    "https://kroger.attacker.example/p/chicken-breasts/0027061550000",
            },
            {
                "url": "https://www.kroger.com/p/chicken-breasts/0027061550000",
                "zip": "45202",
            },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a body
    // field does not change the wire URL)
    const twin = await run({
        "url": "https://www.kroger.com/p/chicken-breasts/0027061550000",
        "zipCode": "45202",
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test({
    name: `${ID} live (gated on MRSCRAPER_API_KEY)`,
    ignore: liveSkip("mrscraper"),
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
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
