import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "linkup#search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): fast searchResults bills the $0.005 line`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                q: "latest advances in solid-state batteries",
                depth: "fast",
                maxResults: 3,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no vendor meter: the derived fold IS the bill (outputType defaulted
    // to searchResults at the binding)
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { search: 1 },
    });
    const results = (result.output as { results: { type: string }[] })
        .results;
    assertEquals(results.length, 2); // record trims
    assertEquals(results[0].type, "text");
});

Deno.test(`${ID} sourced answer (recorded): bills the $0.006 line`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}sourced-answer.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                q: "When was Deno 2.0 released?",
                outputType: "sourcedAnswer",
                maxResults: 3,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.006 },
        evidence: { answer: 1 },
    });
    const output = result.output as { answer: string; sources: unknown[] };
    assertEquals(typeof output.answer, "string");
    assertEquals(output.sources.length, 2);
});

Deno.test(`${ID} deep: the 10x lines settle from the request`, async () => {
    const unit = await testSealedUnit(ID);
    // replay matches method + url, so one chain serves every price cell
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const deep = await runEndpoint({
        unit,
        input: { body: { q: "solid-state batteries", depth: "deep" } },
        mode: "replay",
        fixture,
    });
    assertEquals(deep.usage, {
        credits: { default: 0.05 },
        evidence: { deep_search: 1 },
    });
    const deepAnswer = await runEndpoint({
        unit,
        input: {
            body: {
                q: "solid-state batteries",
                depth: "deep",
                outputType: "structured",
                structuredOutputSchema: '{"type":"object"}',
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(deepAnswer.usage, {
        credits: { default: 0.055 },
        evidence: { deep_answer: 1 },
    });
});

Deno.test(`${ID} estimate: defaults to standard searchResults, one line per cell`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: { q: "x" } }), {
        credits: { default: 0.005 },
        evidence: { search: 1 },
    });
    assertEquals(
        await estimateEndpoint(unit, {
            body: { q: "x", depth: "flash", outputType: "sourcedAnswer" },
        }),
        { credits: { default: 0.006 }, evidence: { answer: 1 } },
    );
    assertEquals(
        await estimateEndpoint(unit, { body: { q: "x", depth: "deep" } }),
        { credits: { default: 0.05 }, evidence: { deep_search: 1 } },
    );
});

Deno.test(`${ID} provider error: 401 is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { q: "anything" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Unauthorized action",
        code: "UNAUTHORIZED",
        raw: {
            error: {
                code: "UNAUTHORIZED",
                details: [],
                message: "Unauthorized action",
            },
            statusCode: 401,
        },
    });
});

Deno.test(`${ID}: strict body — unknown keys and bad enums never reach the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bodies: Json[] = [
        {},
        { q: "x", query: "x" },
        { q: "x", depth: "turbo" },
        { q: "x", fromDate: "2026/01/01" },
    ];
    for (const body of bodies) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    // passing near-twins: ISO dates, the vendor's null dates, and the
    // string spelling of a boolean flag all clear the gate
    const accepted: Json[] = [
        { q: "x", fromDate: "2026-01-01", toDate: "2026-06-30" },
        { q: "x", fromDate: null, toDate: null },
        { q: "x", includeImages: "true" },
    ];
    for (const body of accepted) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: 0.005 },
            evidence: { search: 1 },
        });
    }
});

Deno.test("linkup interning: estimate == evidence; auth + fromError provider-shared", async () => {
    const bundle = await testBundle();
    const search = bundle.endpoints["linkup#search"];
    const fetch = bundle.endpoints["linkup#fetch"];
    // both quantities fns read only the request — one fnTable entry
    assertEquals(search.usage.estimate.$fn.key, search.usage.evidence.$fn.key);
    assertEquals(fetch.usage.estimate.$fn.key, fetch.usage.evidence.$fn.key);
    assert(search.usage.evidence.$fn.key !== fetch.usage.evidence.$fn.key);
    assertEquals(search.auth.inject.$fn.key, fetch.auth.inject.$fn.key);
    assertEquals(
        search.output.fromError?.$fn.key,
        fetch.output.fromError?.$fn.key,
    );
});

Deno.test({
    name: `${ID} live (gated on LINKUP_API_KEY)`,
    ignore: liveSkip("linkup"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    q: "deno 2 workspace guide",
                    depth: "fast",
                    maxResults: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: one priced line, settled in the dollar pool
        assertEquals(Object.keys(result.usage.evidence), ["search"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const results = (result.output as { results: unknown[] }).results;
        assert(Array.isArray(results) && results.length > 0);
    },
});
