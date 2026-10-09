import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const EXPRESSION = {
    linemode: "R",
    searchline: {
        searchterm: "spotify",
        filters: [{ type: "lang", id: "en" }],
    },
};

Deno.test("opoint#search-advanced happy (synthetic): one call; same projection as /search, debug kept", async () => {
    const unit = await testSealedUnit("opoint#search-advanced");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { expressions: [EXPRESSION] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.documents, 1);
    assertEquals(output.debug, {
        count: 1,
        lines: [{ state: 0, query: "spotify" }],
    });
    const doc = (output.document as Record<string, unknown>[])[0];
    assertEquals(doc.header, "Headline 0");
    assertEquals(doc.url, undefined, "tracking url leaked");
});

Deno.test("opoint#search-advanced provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("opoint#search-advanced");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { expressions: [EXPRESSION] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("opoint#search-advanced: at least one expression, linemode from {R,O,E}, filter types closed", async () => {
    const unit = await testSealedUnit("opoint#search-advanced");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const rejected: Json[] = [
        { expressions: [] },
        { expressions: [{ ...EXPRESSION, linemode: "X" }] },
        {
            expressions: [{
                linemode: "R",
                searchline: {
                    searchterm: "spotify",
                    filters: [{ type: "bogus", id: 1 }],
                },
            }],
        },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // numeric filter ids are as valid as literal ones
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                expressions: [{
                    linemode: "R",
                    searchline: {
                        searchterm: "spotify",
                        filters: [{ type: "geo", id: 1203 }],
                    },
                }],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
});

Deno.test("opoint#search-advanced happy (recorded 2026-09-16): real traffic settles one call; the projection holds", async () => {
    const unit = await testSealedUnit("opoint#search-advanced");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                expressions: [EXPRESSION],
                params: { requestedarticles: 1 },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    const docs = (output.document ?? []) as Record<string, unknown>[];
    // pin the fixture count (PR review): an empty projection must FAIL,
    // not vacuously pass the leak loop below
    assertEquals(output.documents, 1);
    assertEquals(docs.length, 1);
    for (const doc of docs) {
        // the projection holds on REAL traffic, not just synthetic shapes
        for (
            const dropped of [
                "url",
                "summary",
                "body",
                "quotes",
                "internal_search_reply",
            ]
        ) {
            assertEquals(doc[dropped], undefined, `${dropped} leaked`);
        }
        if (typeof doc.snippet === "string") {
            assert(doc.snippet.length <= 256, "snippet over the 256 cap");
        }
    }
});

Deno.test({
    name:
        "opoint#search-advanced live (gated on OPOINT_API_KEY) — one band call",
    ignore: liveSkip("opoint"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("opoint#search-advanced"),
            input: {
                body: {
                    expressions: [EXPRESSION],
                    params: { requestedarticles: 1 },
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // live convention: shape, not amounts (PR review) — the flat
        // call is evidenced; the pool drain amount is replay's to pin
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
