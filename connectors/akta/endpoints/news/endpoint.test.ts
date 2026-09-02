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
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // one credits settle fn, one array→CSV hook, one auth fn — shared
        assertEquals(
            doc.usage.consolidate.$fn.key,
            first.usage.consolidate.$fn.key,
        );
        assertEquals(
            doc.input.toRequest?.$fn.key,
            first.input.toRequest?.$fn.key,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
    }
});

Deno.test("akta#news happy (synthetic): credits are the native unit; arrays go comma-separated", async () => {
    const unit = await testSealedUnit("akta#news");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
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
    // native unit = credits; vendor cost derived ($1 = 20 credits)
    assertEquals(result.usage.units, [{ amount: 2.5, unit: "credit" }]);
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 125_000, // 2.5 / 20 dollars = $0.125 = 125k micro-dollars
        unit: "MICRO_DOLLAR",
    });
    assertEquals(result.usage.evidence?.credits_consumed, 2.5);
    // billing field absorbed into usage — one shape, not two
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test("akta#news: impossible calendar dates rejected by the compiled schema", async () => {
    const unit = await testSealedUnit("akta#news");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
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
                },
            },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test("akta#news provider error (synthetic): zero usage", async () => {
    const unit = await testSealedUnit("akta#news");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { company: "nope" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
});

Deno.test({
    name: "akta#news live (gated on AKTA_API_KEY)",
    ignore: liveSkip("akta"),
    fn: async () => {
        const unit = await testSealedUnit("akta#news");
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
        assertEquals(result.usage.units[0]?.unit, "credit");
    },
});
