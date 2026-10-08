import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "venice#augment/search";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): flat $0.01, structured results`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "deno 2.9 release notes", limit: 3 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}search-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    const results = output.results as Record<string, unknown>[];
    assertEquals(typeof results[0].url, "string");
    assertEquals(typeof results[0].title, "string");
});

Deno.test(`${ID} schema gate: limit over 20 and unknown backends are rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}search-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { query: "q", limit: 21 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { query: "q", search_provider: "bing" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on VENICE_API_KEY)`,
    ignore: liveSkip("venice"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "venice ai", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.results), true);
    },
});
