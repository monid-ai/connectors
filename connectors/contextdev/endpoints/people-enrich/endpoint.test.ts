import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#people/enrich";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        name: { first: "Patrick", last: "Collison" },
        company: { domain: "stripe.com" },
    },
};

Deno.test(`${ID} happy (synthetic): a candidate bills twenty credits`, async () => {
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
        credits: { default: 20 },
        evidence: { RESULT: 1 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} not found (synthetic): draws nothing, and the vendor agrees`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-not-found.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} provider error (synthetic 422 free email): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { email: "someone@gmail.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the minimum-clue rule is enforced before the wire`, async () => {
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
            { name: { first: "Patrick", last: "Collison" } },
            { company: { domain: "stripe.com" } },
            { social_urls: [] },
            { email: "not-an-email" },
            { ...INPUT.body, tags: ["x"] },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    for (
        const good of [
            { email: "patrick@stripe.com" },
            { social_urls: ["https://www.linkedin.com/in/patrickcollison"] },
            {
                name: { first: "Patrick", last: "Collison" },
                location: { country: "Ireland" },
            },
            {
                name: { first: "Patrick", last: "Collison" },
                education: [{ institution: { name: "MIT" } }],
            },
        ]
    ) {
        // the near twin passes the gate and replays the happy chain (a POST
        // body does not change the wire URL)
        const twin = await run(good);
        assertEquals(twin.httpStatus, 200);
    }
});

Deno.test({
    name: `${ID} live (gated on CONTEXTDEV_API_KEY)`,
    ignore: liveSkip("contextdev"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            // a public figure at a public company (placeholder identity
            // convention)
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
            Object.prototype.toString.call(
                (result.output as Record<string, unknown>).match,
            ),
            "[object Object]",
            JSON.stringify(result.output),
        );
    },
});
