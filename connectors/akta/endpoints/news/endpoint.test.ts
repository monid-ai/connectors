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

Deno.test("akta: usage fn provenance — OWN evidence vs provider vs synthesized", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("akta#")
    );
    assertEquals(ids.length, 6);
    const first = bundle.endpoints[ids[0]];
    // D27 subclassing: evidence resolves endpoint ?? provider, so the
    // docs that declare NO evidence of their own — news AND the two FREE
    // lookups — all inherit the PROVIDER's generic fn (one key; on a
    // FREE model it lawfully returns {counts: {}}). Synthesis never
    // fires for evidence here because the provider declares one.
    const providerEvidenceKey =
        bundle.endpoints["akta#v1/news"].usage.evidence.$fn.key;
    const sharedEvidence = ids.filter((id) =>
        bundle.endpoints[id].usage.evidence.$fn.key === providerEvidenceKey
    );
    assertEquals(sharedEvidence.sort(), [
        "akta#v1/company/search",
        "akta#v1/industry/search",
        "akta#v1/news",
    ]);
    // The provider declares no ESTIMATE, so the FREE lookups' estimate
    // slot is where the compiler-synthesized `() => ({counts: {}})`
    // lands — the ONE shared entry (same $fn.key on both), provenance-
    // labeled by core, distinct from every authored fn.
    const synthesizedKey =
        bundle.endpoints["akta#v1/company/search"].usage.estimate.$fn.key;
    assertEquals(
        bundle.endpoints["akta#v1/industry/search"].usage.estimate.$fn.key,
        synthesizedKey,
    );
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    // exactly three docs OVERRIDE the provider evidence with their own
    // counting basis (section-keyed / requested-quantity billing) —
    // distinct keys, none of them the provider's or the synthesized one
    const ownEvidence = ids.filter((id) => {
        const key = bundle.endpoints[id].usage.evidence.$fn.key;
        return key !== providerEvidenceKey && key !== synthesizedKey;
    });
    assertEquals(ownEvidence.sort(), [
        "akta#v1/company/employee-reviews",
        "akta#v1/company/enrichment",
        "akta#v1/company/product-reviews",
    ]);
    assertEquals(
        new Set(
            ownEvidence.map((id) =>
                bundle.endpoints[id].usage.evidence.$fn.key
            ),
        ).size,
        3,
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // the vendor-meter fn is a PROVIDER-wide fact (where
        // credits_consumed lives) — ONE consolidate key across all six
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
        );
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
    // D27 claim-wins: the fixture's credits_consumed (0.12) is the
    // VENDOR's own meter — usage.credits IS that claim, verbatim. Our
    // fold (0.1 flat + 2 × 0.01/article = 0.12) agrees within 1e-9, so
    // no mismatch key settles (zUsage is strict — deep-equality proves
    // its absence). The literal 0.12 matters: the arithmetic form
    // 0.1 + 2 * 0.01 is a different double (float dust) than the
    // fixture-parsed claim.
    assertEquals(result.usage, {
        credits: { default: 0.12 },
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
    // the fixture's credits_consumed is 0 — a present zero PRUNES to an
    // empty claim (D27), so the DERIVED fold settles: zero articles
    // delivered, the flat request still bills its 0.1 credits
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
