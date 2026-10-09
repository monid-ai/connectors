import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#web/scrape/sitemap";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { domain: "example.com", maxLinks: 2 } };

Deno.test(`${ID} happy (synthetic): one credit without a search phrase`, async () => {
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
        evidence: { search_surcharge: 0, crawl: 1 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} searched (synthetic): the search phrase adds a credit, and the vendor agrees`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-searched.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "example.com", search: "pricing" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { search_surcharge: 1, crawl: 1 },
    });
});

Deno.test(`${ID} provider error (synthetic 400): zero usage`, async () => {
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
});

Deno.test(`${ID}: the compiled schema gates the domain and the bounds`, async () => {
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
            { domain: "ex" },
            { domain: "example.com", maxLinks: 100001 },
            { domain: "example.com", search: "a" },
            { domain: "example.com", sitemapUrl: "example.com/sitemap.xml" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    await assertRejects(
        () =>
            run({
                domain: "example.com",
                maxLinks: 100000,
                search: "ab",
                sitemapUrl: "https://example.com/sitemap.xml",
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
        assertEquals(
            Object.keys(result.usage.evidence).sort(),
            ["crawl", "search_surcharge"],
        );
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).urls),
            true,
            JSON.stringify(result.output),
        );
    },
});
