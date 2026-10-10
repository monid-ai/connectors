import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("bowmark: two endpoints, one auth fn, dollar pool, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("bowmark#")
    ).sort();
    assertEquals(ids, ["bowmark#library", "bowmark#run"]);

    const library = bundle.endpoints["bowmark#library"];
    const run = bundle.endpoints["bowmark#run"];
    assertEquals(library.request.method, "GET");
    assertEquals(
        library.request.url,
        "https://api.bowmark.ai/v1/monid/library",
    );
    assertEquals(run.request.method, "POST");
    assertEquals(run.request.url, "https://api.bowmark.ai/v1/monid/run");

    assertEquals(library.auth.inject.$fn.key, run.auth.inject.$fn.key);
    assertEquals(library.usage.consolidate, undefined);
    assertEquals(run.usage.consolidate, undefined);
    assertEquals(library.usage.model.kind, "FREE");
    assertEquals(run.usage.model.kind, "PER_UNIT");
    assertEquals(Object.keys(run.usage.credits), ["default"]);
});

Deno.test("bowmark#library happy (recorded): JSON envelope, free", async () => {
    const unit = await testSealedUnit("bowmark#library");
    const fixture = await loadFixture(`${fixturesDir}library-flights.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "flights" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.query, "flights");
    assert(
        typeof output.library === "string" &&
            (output.library as string).includes("bowmark.flights"),
        "library markdown names the capability",
    );
});

Deno.test("bowmark#library: query optional but never empty; unknown keys rejected", async () => {
    const unit = await testSealedUnit("bowmark#library");
    const fixture = await loadFixture(`${fixturesDir}library-flights.json`);
    const rejected: Record<string, Json>[] = [
        { query: "" },
        { query: "x", bogus: 1 },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
});

Deno.test({
    name: "bowmark#library live (gated on BOWMARK_API_KEY)",
    ignore: liveSkip("bowmark"),
    fn: async () => {
        const unit = await testSealedUnit("bowmark#library");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "flights" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.library, "string");
    },
});
