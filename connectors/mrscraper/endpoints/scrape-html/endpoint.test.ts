import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mrscraper#scrape/html";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { url: "https://example.com" } };

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
    // the claim (token_usage 2) equals the fold (2 × 1 token), so no
    // mismatch key settles (zUsage is strict — deep-equality proves it)
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { TOKEN: 2 },
    });
    assertEquals(result.output, {
        success: true,
        url: "https://example.com",
        html:
            "<!doctype html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1></body></html>",
    });
});

Deno.test(`${ID} options (synthetic): body options ride the query string with the preset flags`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-options.json`);
    // the fixture URL is the proof: html=true&saveResult=false first, then
    // the lifted options, and the body carries only the url
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com",
                geoCode: "de",
                browserRendering: true,
                blockResources: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { TOKEN: 4 },
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

Deno.test(`${ID}: the compiled schema gates the url and the options`, async () => {
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
            { url: "example.com" },
            { url: "https://example.com", waitUntil: "idle" },
            { url: "https://example.com", timeout: 301 },
            { url: "https://example.com", retry: true },
            { url: "https://example.com", screenshot: "full" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes validation (it fails later, at replay URL
    // matching — the lifted option changes the wire URL — proving the
    // gate let it through)
    const error = await assertRejects(() =>
        run({
            url: "https://example.com",
            waitUntil: "networkidle0",
            timeout: 300,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
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
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["TOKEN"]);
    },
});
