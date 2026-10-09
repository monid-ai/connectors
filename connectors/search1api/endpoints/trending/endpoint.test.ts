import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "search1api#trending";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): whole usage, trending items out`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { search_service: "github", max_results: 3 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}trending-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), [
        "results",
        "trendingParameters",
    ]);
    assertEquals(Array.isArray(output.results), true);
});

Deno.test(`${ID} empty results (200): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { search_service: "hackernews", max_results: 3 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-trending-empty.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as Record<string, unknown>).results, []);
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { search_service: "github" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: rejects an unknown service, passes the other`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}trending-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { search_service: "tiktok" } },
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
                input: { body: { search_service: "github", max_result: 3 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: the other documented service passes the same gate
    const nearTwin = await runEndpoint({
        unit,
        input: { body: { search_service: "hackernews" } },
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
            input: { body: { search_service: "hackernews", max_results: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.results), true);
        assertEquals((output.results as unknown[]).length > 0, true);
    },
});
