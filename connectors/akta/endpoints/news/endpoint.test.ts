import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("akta: provider-level hooks interned ONCE across all six endpoints", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("akta#")
    );
    assertEquals(ids.length, 6);
    const first = bundle.endpoints[ids[0]];
    // D26: every metered doc settles its OWN quantities (the provider
    // declares only the credit pool), so the sole interned settle group
    // left is the two byte-identical FREE lookups; toRequest/auth stay
    // provider-shared.
    const freeConsolidated = ids.filter((id) =>
        bundle.endpoints[id].usage.consolidate.$fn.key ===
            bundle.endpoints["akta#v1/company/search"].usage
                .consolidate.$fn.key
    );
    assertEquals(freeConsolidated.sort(), [
        "akta#v1/company/search",
        "akta#v1/industry/search",
    ]);
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // one array→CSV hook, one auth fn — shared provider-wide
        assertEquals(
            doc.input.toRequest?.$fn.key,
            first.input.toRequest?.$fn.key,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
    }
});

Deno.test("akta#news happy (recorded): credits are the native unit; arrays go comma-separated", async () => {
    const unit = await testSealedUnit("akta#v1/news");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                company: "https://canva.com",
                // ARRAY in the schema — the provider toRequest joins to
                // "positive,neutral" (the fixture URL proves the wire form)
                sentiment_list: ["positive", "neutral"],
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // COMPOSITE vector (D25/D26): articles delivered + the engine-appended
    // flat request 1, folded through the doc's own rate card — the flat
    // 0.1-credit request plus 0.01 credits per article (vendor receipts
    // like credits_consumed stay in the RAW run record, never in usage)
    assertEquals(result.usage, {
        credits: { default: 0.1 + 2 * 0.01 },
        evidence: { article: 2, request: 1 },
    });
    // billing field absorbed out of the payload — the raw record keeps it
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test("akta#news empty (recorded): unknown company is 200 — only the flat request bills", async () => {
    const unit = await testSealedUnit("akta#v1/news");
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        // limit is caller-stated (required at the binding, D25); 10 matches
        // the recorded wire URL
        input: { queryParams: { company: "nope", limit: 10 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // money follows evidence: zero articles delivered; the flat request
    // still bills its 0.1 credits (engine-appended)
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { article: 0, request: 1 },
    });
    assertEquals((result.output as Record<string, unknown>).count, 0);
});

Deno.test("akta#news: impossible calendar dates rejected by the compiled schema", async () => {
    const unit = await testSealedUnit("akta#v1/news");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    // z.iso.date() compiles calendar-aware: month/day bounds + leap years
    for (
        const start_date of [
            "2024-02-30",
            "2023-02-29",
            "2024-13-01",
            "24-01-01",
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: {
                        queryParams: {
                            company: "https://canva.com",
                            start_date,
                            limit: 10,
                        },
                    },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // leap day on a real leap year passes validation (it fails later, at
    // replay URL matching — proving the schema let it through)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: {
                queryParams: {
                    company: "https://canva.com",
                    start_date: "2024-02-29",
                    limit: 10,
                },
            },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("akta#news provider error (recorded 401): zero usage", async () => {
    const unit = await testSealedUnit("akta#v1/news");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { company: "https://canva.com", limit: 10 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "akta#news live (gated on AKTA_API_KEY)",
    ignore: liveSkip("akta"),
    fn: async () => {
        const unit = await testSealedUnit("akta#v1/news");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "warehouse automation", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            Object.keys(result.usage.evidence).sort(),
            ["article", "request"],
        );
    },
});
