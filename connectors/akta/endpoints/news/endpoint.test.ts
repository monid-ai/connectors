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
    // D25: news/enrichment settle their own quantities and the FREE
    // lookups settle the free shape — the provider credits fn now serves
    // only the CREDIT-metered docs; toRequest/auth stay provider-shared.
    const providerConsolidated = ids.filter((id) =>
        bundle.endpoints[id].usage.consolidate.$fn.key ===
            bundle.endpoints["akta#v1/company/employee-reviews"].usage
                .consolidate.$fn.key
    );
    assertEquals(providerConsolidated.sort(), [
        "akta#v1/company/employee-reviews",
        "akta#v1/company/product-reviews",
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
    // COMPOSITE vector (D25): articles delivered + the engine-appended flat
    // request 1; the vendor's own meter rides as cost basis + evidence
    assertEquals(result.usage.counts, { "article": 2, "request": 1 });
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 6_000, // 0.12 / 20 dollars = $0.006 = 6k micro-dollars
        unit: "MICRO_DOLLAR",
    });
    assertEquals(result.usage.evidence?.credits_consumed, 0.12);
    // billing field absorbed into usage — one shape, not two
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test("akta#news empty (recorded): unknown company is 200 with zero credits", async () => {
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
    // still bills (engine-appended)
    assertEquals(result.usage.counts, { "article": 0, "request": 1 });
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
    assertEquals(result.usage.counts, {});
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
            Object.keys(result.usage.counts).sort(),
            ["article", "request"],
        );
    },
});
