import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "search1api#sitemap";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): whole usage, links array out`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://s1.dev", type: "sitemap" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}sitemap-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output), ["links"]);
    assertEquals(Array.isArray(output.links), true);
});

Deno.test(`${ID} empty links (200): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com", type: "sitemap" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-sitemap-empty.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as Record<string, unknown>).links, []);
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://s1.dev" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects an unknown type, passes 'all'`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}sitemap-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { url: "https://s1.dev", type: "deep" } },
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
                input: { body: { url: "https://s1.dev", typ: "all" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: the other documented type passes the same gate
    const nearTwin = await runEndpoint({
        unit,
        input: { body: { url: "https://s1.dev", type: "all" } },
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
            input: { body: { url: "https://s1.dev" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.links), true);
        assertEquals((output.links as unknown[]).length > 0, true);
    },
});
