import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#web/scrape/markdown";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { url: "https://example.com" } };

Deno.test(`${ID} happy (synthetic): one credit, the vendor's count wins, envelope stripped`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // the claim (credits_consumed 1) equals the flat fold, so no mismatch
    // key settles (zUsage is strict — deep-equality proves its absence)
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} billed above list (synthetic): the vendor's 2 credits win and the fold is the cross-check`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    (fixture.calls[0].res.body as {
        key_metadata: { credits_consumed: number };
    })
        .key_metadata.credits_consumed = 2;
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CALL: 1 },
        mismatch: { derived: { default: 1 } },
    });
});

Deno.test(`${ID} provider error (synthetic 400): zero usage, digested without the balance`, async () => {
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
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const { key_metadata: _envelope, ...raw } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, {
        message: "Failed to access website",
        error_code: "WEBSITE_ACCESS_ERROR",
        raw,
    });
});

Deno.test(`${ID}: the compiled schema gates the url and the options`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (queryParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: queryParams as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { url: "example.com" },
            { url: "https://example.com", not_a_context_param: "x" },
            { url: "https://example.com", waitForMs: 30001 },
            { url: "https://example.com", country: "USA" },
            { url: "https://example.com", country: "zz" },
            { url: "https://example.com", zdr: "on" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes validation (it fails later, at replay URL
    // matching — proving the gate let it through)
    await assertRejects(
        () =>
            run({
                url: "http://example.com/docs",
                waitForMs: 30000,
                country: "us",
                zdr: "enabled",
            }),
        Error,
        "replay(",
    );
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
            "key_metadata" in (result.output as Record<string, unknown>),
            false,
        );
        assertEquals(
            typeof (result.output as Record<string, unknown>).markdown,
            "string",
            JSON.stringify(result.output),
        );
    },
});
