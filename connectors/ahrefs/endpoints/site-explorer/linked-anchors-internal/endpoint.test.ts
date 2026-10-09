import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "ahrefs#site-explorer/linked-anchors-internal";
const INPUT = { "queryParams": { "target": "ahrefs.com", "limit": 3 } };

Deno.test(`${ID} happy (synthetic): 3 row(s) ⇒ max(50, 4 × 3) = 50 units`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        "credits": { "default": 50 },
        "evidence": { "rows": 3, "minimum_top_up": 38 },
    });
});

Deno.test(`${ID} empty (synthetic): zero rows still draws the 50-unit request minimum`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        "credits": { "default": 50 },
        "evidence": { "rows": 0, "minimum_top_up": 50 },
    });
});

Deno.test(`${ID} provider error (synthetic 400): data, zero usage, digested envelope`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "invalid filter",
    );
});

Deno.test(`${ID} schema gate: bad inputs are rejected before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            { "target": "ahrefs.com" },
            { "target": "ahrefs.com", "limit": 101 },
            {
                "target": "ahrefs.com",
                "limit": 3,
                "where": '{"field":"traffic","is":["gt",100]}',
            },
            { "target": "ahrefs.com", "limit": 3, "order_by": "traffic" },
            { "target": "ahrefs.com", "limit": 3, "order_by": "first_seen:up" },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: bad },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(bad),
        );
    }
});

Deno.test(`${ID} schema gate: a filter and a sort inside the fixed field set pass (no IO)`, async () => {
    const unit = await testSealedUnit(ID);
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(unit);
    const twin = {
        queryParams: {
            ...INPUT.queryParams,
            where: '{"field":"anchor","is":["eq","x"]}',
            order_by: "anchor:desc",
        },
    };
    // the near-twin of the rejected inputs passes the gate, and a filter
    // inside the fixed field set does not move the hold
    assertEquals(loaded.estimate(twin), loaded.estimate(INPUT));
});

Deno.test({
    name: `${ID} live (gated on AHREFS_API_KEY; may consume API units)`,
    ignore: liveSkip("ahrefs"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({ unit, input: INPUT, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.evidence.rows, "number");
        assertEquals(
            Array.isArray(
                (result.output as Record<string, unknown>).linkedanchors,
            ),
            true,
            JSON.stringify(result.output),
        );
    },
});
