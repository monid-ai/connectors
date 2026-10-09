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

const ARTICLES = [
    { id_site: 11, id_article: 1 },
    { id_site: 11, id_article: 2 },
];

Deno.test("opoint#search-by-ids happy (synthetic): one call; the requested articles come back projected", async () => {
    const unit = await testSealedUnit("opoint#search-by-ids");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { params: { articles: ARTICLES } } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    const docs = output.document as Record<string, unknown>[];
    // the requested pairs come back, in order
    assertEquals(
        docs.map((doc) => ({
            id_site: doc.id_site,
            id_article: doc.id_article,
        })),
        ARTICLES,
    );
    assertEquals(docs[1].url, undefined, "tracking url leaked");
});

Deno.test("opoint#search-by-ids provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("opoint#search-by-ids");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { params: { articles: ARTICLES } } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("opoint#search-by-ids: articles required (1-100), no searchterm accepted", async () => {
    const unit = await testSealedUnit("opoint#search-by-ids");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const rejected: Json[] = [
        { params: {} },
        { params: { articles: [] } },
        { searchterm: "x", params: { articles: ARTICLES } },
        { params: { articles: [{ id_site: 11 }] } },
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
});

Deno.test("opoint#search-by-ids happy (recorded 2026-09-16): real traffic settles one call; the projection holds", async () => {
    const unit = await testSealedUnit("opoint#search-by-ids");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                params: { articles: [{ id_site: 455449, id_article: 662 }] },
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
    name: "opoint#search-by-ids live (gated on OPOINT_API_KEY) — one band call",
    ignore: liveSkip("opoint"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("opoint#search-by-ids"),
            input: {
                body: {
                    params: {
                        articles: [{ id_site: 455449, id_article: 662 }],
                    },
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
