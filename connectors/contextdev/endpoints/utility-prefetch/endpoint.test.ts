import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#utility/prefetch";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { type: "brand", identifier: { domain: "stripe.com" } } };

Deno.test(`${ID} happy (synthetic): free acknowledgment, envelope stripped`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} provider error (synthetic 422 free email): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: { type: "brand", identifier: { email: "jane@gmail.com" } },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: exactly one identifier key; the body is strict`, async () => {
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
            { type: "brand", identifier: {} },
            {
                type: "brand",
                identifier: { domain: "stripe.com", email: "jane@stripe.com" },
            },
            { type: "logo", identifier: { domain: "stripe.com" } },
            {
                ...INPUT.body,
                timeoutOpts: { milliseconds: 5000, behavior: "return-partial" },
            },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a POST
    // body does not change the wire URL)
    const twin = await run({
        type: "styleguide",
        identifier: { email: "jane@stripe.com" },
        timeoutOpts: { milliseconds: 5000, behavior: "fail" },
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
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            typeof (result.output as Record<string, unknown>).status,
            "string",
            JSON.stringify(result.output),
        );
    },
});
