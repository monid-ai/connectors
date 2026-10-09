import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "vaquill#us/statutes/search";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    body: {
        query: "insider trading penalties",
        limit: 2,
        fields: [
            "actId",
            "citation",
            "title",
            "excerpt",
            "corpusType",
            "state",
            "goodLawStatus",
        ],
    },
};

Deno.test(`${ID} happy: a plain page bills the flat search line only`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}search-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { call: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assertEquals((output.results as unknown[]).length, 2);
    assertEquals(output.count, 2);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: limit above the vendor's 50 is refused before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}search-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { query: "insider trading", limit: 51 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: 50 is accepted, so the gate is not simply rejecting every limit. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: "insider trading", limit: 50 },
        }),
        { credits: { default: 4 }, evidence: { call: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "federal wiretap statute",
                    limit: 2,
                    fields: ["actId", "citation", "title"],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the corpus moves, so pin the pool settled
        // rather than a figure
        assertEquals(typeof result.usage.credits.default, "number");
        assert(
            (result.output as Record<string, Json>).results !== undefined,
            "a live search must carry results",
        );
    },
});

Deno.test(`${ID} includeBody: the flat search plus one body line per row that returned text`, async () => {
    const unit = await testSealedUnit(ID);
    const input = {
        body: {
            query: "insider trading penalties",
            limit: 2,
            includeBody: true,
            fields: ["actId", "citation", "title", "body"],
        },
    };
    // the PROMISE, before the wire: `limit` is the only body count a
    // pre-run estimate can read, so it quotes the ceiling
    assertEquals(await estimateEndpoint(unit, input), {
        credits: { default: 16 },
        evidence: { body: 2, call: 1 },
    });

    const result = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}search-bodies-ok.json`),
    });
    // and the BILL: both rows returned text, so 4 + 2 x 6, agreeing with
    // the vendor's own claim, so no `mismatch` key
    assertEquals(result.usage, {
        credits: { default: 16 },
        evidence: { body: 2, call: 1 },
    });
    const rows = (result.output as Record<string, Json>)
        .results as Record<string, Json>[];
    assertEquals(rows.length, 2);
    assert(rows.every((row) => typeof row.body === "string"));
});

Deno.test(`${ID} a thin page estimates high and settles low`, async () => {
    const unit = await testSealedUnit(ID);
    // ONE input for both halves: the estimate and the settle must be
    // compared on the same request or neither number means anything.
    const input = {
        body: {
            query: "trade secret misappropriation remedies",
            corpusType: "USC",
            titleNumber: 18,
            chapter: "90",
            limit: 10,
            includeBody: true,
            fields: ["actId", "citation", "title", "body"],
        },
    };
    // the promise: `limit` is the only body count a pre-run hook can read
    assertEquals(await estimateEndpoint(unit, input), {
        credits: { default: 64 },
        evidence: { body: 10, call: 1 },
    });
    // the bill: this scope holds 9 sections, not 10, so the settle counts 9
    // bodies and comes in under the promise. 4 + 9 x 6 = 58, which is what
    // the vendor claimed, so no `mismatch` rides out.
    const result = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}search-thin-bodies-ok.json`),
    });
    assertEquals(result.usage, {
        credits: { default: 58 },
        evidence: { body: 9, call: 1 },
    });
    assertEquals(
        ((result.output as Record<string, Json>).results as unknown[]).length,
        9,
    );
});

Deno.test(`${ID} empty page: the vendor charges the search, the caller pays nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const input = {
        body: {
            query: "zzqxv plorfgh wuxtrel",
            matchType: "phrase",
            corpusType: "CONSTITUTION",
            limit: 1,
        },
    };
    // the promise is the list price: a pre-run hook cannot know the page
    // will be empty
    assertEquals(await estimateEndpoint(unit, input), {
        credits: { default: 4 },
        evidence: { call: 1 },
    });
    const result = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}search-empty-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // `creditsConsumed: 4` in the fixture is declined; the fold counts 0
    // answered pages and no body rows
    assertEquals(result.usage, { credits: {}, evidence: { call: 0 } });
    const output = result.output as Record<string, Json>;
    assertEquals((output.results as unknown[]).length, 0);
    assertEquals("creditsConsumed" in output, false);
});
