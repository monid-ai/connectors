import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("exa#search happy: usage from the RAW envelope; costDollars consolidated away", async () => {
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
    // usage: measures carry number + unit; vendor-reported usd cost (READ, not computed)
    assertEquals(result.usage.units, [{ amount: 3, unit: "result" }]);
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 5_000,
        unit: "MICRO_DOLLAR",
    });
    // capture: audit receipts, read from the RAW envelope
    assertEquals(
        result.usage.evidence?.requestId,
        "b5947044c4b78efa9552430b7ca5cf94",
    );
    assertEquals(result.usage.evidence?.costDollars, {
        total: 0.005,
        search: { neural: 0.005 },
    });
    // usage.consolidate ran (engine-executed, same for every operator):
    // billing info now lives ONLY in the structured usage above
    const output = result.output as Record<string, unknown>;
    assertEquals("costDollars" in output, false);
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
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
    assertEquals(result.usage.cost, undefined);
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
        assertEquals(result.usage.units[0]?.unit, "result");
        assert(result.usage.units[0]!.amount >= 1);
        assertEquals(result.usage.cost?.unit, "MICRO_DOLLAR");
        // consolidated — billing lives in usage, not the payload
        assert(!("costDollars" in (result.output as Record<string, unknown>)));
    },
});
