import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#brand/retrieve";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { type: "by_domain", domain: "stripe.com" } };

Deno.test(`${ID} happy (synthetic): ten credits, envelope stripped`, async () => {
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
});

Deno.test(`${ID} cached (synthetic): a zero claim prunes and the list rate settles`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    (fixture.calls[0].res.body as {
        key_metadata: { credits_consumed: number };
    })
        .key_metadata.credits_consumed = 0;
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    // a present 0 prunes to an empty claim (D27): the derived fold bills
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CALL: 1 },
    });
});

Deno.test(`${ID} provider error (synthetic 422 free email): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { type: "by_email", email: "jane@gmail.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: one lookup key, selected by type; each arm is strict`, async () => {
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
            { domain: "stripe.com" },
            { type: "by_domain" },
            { type: "by_domain", domain: "stripe.com", name: "Stripe" },
            {
                type: "by_direct_url",
                direct_url: "https://stripe.com",
                maxSpeed: true,
            },
            { type: "by_ticker", ticker: "AAPL!" },
            { type: "by_name", name: "AB" },
            { type: "by_email", email: "not-an-email" },
            { type: "by_domain", domain: "stripe.com", tags: ["x"] },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    for (
        const good of [
            { type: "by_name", name: "Stripe", country_gl: "us" },
            { type: "by_ticker", ticker: "AAPL", ticker_exchange: "NASDAQ" },
            {
                type: "by_direct_url",
                direct_url: "https://stripe.com/enterprise",
            },
            {
                type: "by_transaction",
                transaction_info: "SQ *COFFEE BAR 4157",
                mcc: 5812,
                high_confidence_only: true,
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
            Object.prototype.toString.call(
                (result.output as Record<string, unknown>).brand,
            ),
            "[object Object]",
            JSON.stringify(result.output),
        );
    },
});
