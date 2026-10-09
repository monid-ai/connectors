import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mrscraper#scrape/map";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { url: "https://quotes.toscrape.com/", maxPages: 2 } };

Deno.test(`${ID} happy (synthetic): bills the vendor's token meter, internals stripped`, async () => {
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
        credits: { default: 30 },
        evidence: { TOKEN: 30 },
    });
    const {
        token_usage: _meter,
        residential_proxy_usage: _proxy,
        data_path: _d,
        ...body
    } = fixture.calls[0].res.body as Record<string, Json>;
    assertEquals(result.output, body);
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

Deno.test(`${ID}: the map agent takes no rendering knobs`, async () => {
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
            { url: "https://quotes.toscrape.com/", browserRendering: true },
            { url: "https://quotes.toscrape.com/", maxPages: 21 },
            { url: "https://quotes.toscrape.com/", includePatterns: [""] },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    const twin = await run({
        url: "https://quotes.toscrape.com/",
        maxPages: 2,
        includePatterns: ["https://quotes.toscrape.com/tag/*"],
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
            input: {
                body: { url: "https://quotes.toscrape.com/", maxPages: 1 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(Object.keys(result.usage.evidence), ["TOKEN"]);
    },
});
