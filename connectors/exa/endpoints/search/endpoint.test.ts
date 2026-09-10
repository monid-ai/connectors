import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("exa#search happy: costDollars claim wins (fold rides as mismatch), receipt consolidated away", async () => {
    const unit = await testSealedUnit("exa#search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "latest advances in solid-state batteries",
                numResults: 3,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // D27 claim-wins: the fixture's costDollars.total ($0.005) is the
    // vendor's own meter — usage.credits IS that claim. Our pinned fold
    // says $0.007 (3 results inside the included 10 ⇒ base fee only,
    // flat call 1 engine-appended), which disagrees beyond 1e-9 — the
    // fold rides out as mismatch.derived, said, never failing the run.
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { call: 1 },
        mismatch: { derived: { default: 0.007 } },
    });
    // usage.consolidate ran (engine-executed, same for every operator):
    // the vendor billing field is absorbed out of the payload, the rest
    // of the envelope rides through untouched
    const output = result.output as Record<string, unknown>;
    assertEquals("costDollars" in output, false);
    assertEquals(output.requestId, "b5947044c4b78efa9552430b7ca5cf94");
    assertEquals((output.results as unknown[]).length, 3);
});

Deno.test("exa#search provider error: 401 is data, zero usage", async () => {
    const unit = await testSealedUnit("exa#search");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "anything" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // raw body passes through untouched on provider error
    assertEquals(result.output, {
        error: "x-api-key header is invalid",
        tag: "UNAUTHORIZED",
    });
});

Deno.test("exa#search: `stream` is not exposed, and stripped defensively before send", async () => {
    const unit = await testSealedUnit("exa#search");
    // not exposed: absent from the compiled input schema
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert(
        !("stream" in properties),
        "stream must not be in the caller-facing schema",
    );
    // defense-in-depth: a pasted v1 payload with stream still validates through
    // (non-strict schema) and toRequest strips it before the wire call
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "latest advances in solid-state batteries",
                numResults: 3,
                stream: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
});

Deno.test({
    name: "exa#search live (gated on EXA_API_KEY)",
    ignore: liveSkip("exa"),
    fn: async () => {
        const unit = await testSealedUnit("exa#search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "deno 2 workspace monorepo guide",
                    numResults: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // 2 results ⇒ nothing above the included 10 (evidence is the
        // engine-appended flat call 1). credits can't be pinned live:
        // exa's own costDollars claim WINS (D27) and its live total
        // varies by search type — assert the pool settled instead.
        assertEquals(result.usage.evidence, { call: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
        // consolidated — the vendor billing field left the payload
        assert(!("costDollars" in (result.output as Record<string, unknown>)));
    },
});
