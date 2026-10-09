import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "search1api#crawl";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): whole usage, markdown content out`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}crawl-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), [
        "crawlParameters",
        "results",
    ]);
    const results = output.results as Record<string, unknown>;
    assertEquals(typeof results.content, "string");
    assertEquals("credits" in results || "usage" in results, false);
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects a missing url, passes a valid one`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}crawl-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: {} },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // strict body: a misspelled key is rejected, not silently dropped
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { url: "https://s1.dev", enableFalback: true } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: the documented flag shape passes the same gate
    const nearTwin = await runEndpoint({
        unit,
        input: {
            body: { url: "https://example.com", enableFallback: true },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(nearTwin.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on SEARCH1API_API_KEY)`,
    ignore: liveSkip("search1api"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        const results = output.results as Record<string, unknown>;
        assertEquals(typeof results.content, "string");
        assertEquals((results.content as string).length > 0, true);
    },
});
