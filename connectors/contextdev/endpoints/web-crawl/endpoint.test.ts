import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "contextdev#web/crawl";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { url: "https://example.com", maxPages: 5 } };

Deno.test(`${ID} happy (synthetic): bills the pages the summary says succeeded`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // numSucceeded 3 of 4 urls (one failed) = the vendor's 3 credits
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { PAGE: 3 },
    });
    const { key_metadata: _envelope, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} empty (synthetic): a crawl that scraped nothing draws nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test(`${ID}: a 200 without metadata.numSucceeded fails instead of counting failed pages`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const body = fixture.calls[0].res.body as Record<string, Json>;
    delete (body.metadata as Record<string, Json>).numSucceeded;
    await assertRejects(
        () => runEndpoint({ unit, input: INPUT, mode: "replay", fixture }),
        Error,
        "$.metadata.numSucceeded",
    );
});

Deno.test(`${ID} provider error (synthetic 404 start URL): zero usage`, async () => {
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

Deno.test(`${ID}: maxPages is required and the body is strict`, async () => {
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
            { url: "https://example.com" },
            { url: "https://example.com", maxPages: 501 },
            { url: "https://example.com", maxPages: 5, tags: ["x"] },
            { url: "https://example.com", maxPages: 5, pdf: { ocr: "yes" } },
            {
                url: "https://example.com",
                maxPages: 5,
                timeoutOpts: { behavior: "fail" },
            },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a POST
    // body does not change the wire URL)
    const twin = await run({
        url: "https://example.com",
        maxPages: 500,
        pdf: { ocr: true, start: 1, end: 3 },
        timeoutOpts: { milliseconds: 60000, behavior: "return-partial" },
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
            input: { body: { url: "https://example.com", maxPages: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["PAGE"]);
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).results),
            true,
            JSON.stringify(result.output),
        );
    },
});
