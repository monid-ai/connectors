import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "search1api#search";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): whole usage, no billing fields in output`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "deno 2 release notes",
                max_results: 3,
                time_range: "month",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}search-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // flat call only — no crawl_results requested, nothing crawled
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { call: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), [
        "results",
        "searchParameters",
    ]);
    assertEquals((output.results as unknown[]).length, 2); // record trims
});

Deno.test(`${ID} deep search (recorded): +1 credit per crawled page`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "deno 2 release notes",
                max_results: 3,
                crawl_results: 2,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}search-deep-ok.json`),
    });
    assertEquals(result.isProviderError, false);
    // 1 call + 2 results carrying crawled `content` = 3 credits
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { call: 1, crawled_page: 2 },
    });
});

Deno.test(`${ID} empty results (200): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "zxqv no such phrase 7f3k", max_results: 3 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-search-empty.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { call: 0 },
    });
    assertEquals((result.output as Record<string, unknown>).results, []);
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "test" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects unknown engine, passes a documented one`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}search-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { max_results: 3 } },
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
                input: {
                    body: { query: "q", search_service: "not-an-engine" },
                },
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
                input: { body: { query: "q", max_result: 3 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: a documented engine value passes the same gate
    const nearTwin = await runEndpoint({
        unit,
        input: { body: { query: "q", search_service: "bingcn" } },
        mode: "replay",
        fixture,
    });
    assertEquals(nearTwin.isProviderError, false);
    const yandex = await runEndpoint({
        unit,
        input: { body: { query: "q", search_service: "yandex" } },
        mode: "replay",
        fixture,
    });
    assertEquals(yandex.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on SEARCH1API_API_KEY)`,
    ignore: liveSkip("search1api"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno release", max_results: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: ranked results with a title/link each
        const output = result.output as Record<string, unknown>;
        const results = output.results as Record<string, unknown>[];
        assertEquals(Array.isArray(results) && results.length > 0, true);
        assertEquals(typeof results[0].title, "string");
        assertEquals(typeof results[0].link, "string");
    },
});
