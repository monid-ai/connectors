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

Deno.test("opoint#search-headlines happy (synthetic): one call; headline rows carry no snippet", async () => {
    const unit = await testSealedUnit("opoint#search-headlines");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { searchterm: "tesla" } },
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
    assertEquals(docs.length, 2);
    for (const doc of docs) {
        assertEquals(typeof doc.header, "string");
        assertEquals(doc.snippet, undefined, "headlines carry no text");
        assertEquals(doc.url, undefined, "tracking url leaked");
    }
});

Deno.test("opoint#search-headlines provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("opoint#search-headlines");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { searchterm: "tesla" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("opoint#search-headlines: searchterm required, allow-list strict", async () => {
    const unit = await testSealedUnit("opoint#search-headlines");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const rejected: Json[] = [
        { params: { requestedarticles: 20 } },
        { searchterm: "tesla", params: { groupidentical: true } },
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

Deno.test("opoint#search-headlines happy (recorded 2026-09-16): real traffic settles one call; the projection holds", async () => {
    const unit = await testSealedUnit("opoint#search-headlines");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { searchterm: "tesla", params: { requestedarticles: 1 } },
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
        "opoint#search-headlines live (gated on OPOINT_API_KEY) — one band call",
    ignore: liveSkip("opoint"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("opoint#search-headlines"),
            input: {
                body: { searchterm: "tesla", params: { requestedarticles: 1 } },
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
