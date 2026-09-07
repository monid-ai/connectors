import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput, UsageModel } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * THE apify test suite (fixture strategy v2): FOUR minimal shared shape
 * chains (fixtures/*.json) exercise every endpoint of the provider —
 * per-endpoint fixtures and tests are gone. `{{request.url}}` /
 * `{{request.origin}}` bind each chain to the endpoint under test;
 * `test-inputs.json` carries one schema-valid input per endpoint (the
 * curated record-table inputs).
 *
 * Custom-billing endpoints get their OWN cases against the pay-per-event
 * chain (linkedin-profile-search: page reconstruction from LIVE run-record
 * rates — finding 5).
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput["body"]>;

/** Endpoints whose consolidate is NOT the provider default. */
const CUSTOM_BILLING = new Set(["linkedin-profile-search"]);

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("apify#"))
        .sort();
};

const inputFor = (id: string): RunInput => {
    const body = INPUTS[id.split("#")[1]];
    assert(body !== undefined, `${id}: no test input in test-inputs.json`);
    return { body };
};

Deno.test("apify: every endpoint completes the run-succeeded chain (2 items, item-priced cost)", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/run-succeeded.json`);
    for (const id of await endpointIds()) {
        if (CUSTOM_BILLING.has(id.split("#")[1])) continue;
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage.units, [{ amount: 2, unit: "RESULT" }], id);
        // PRICE_PER_DATASET_ITEM: 2 × $0.005 — signals threaded via state.data
        assertEquals(result.usage.cost, {
            currency: "USD",
            value: 10_000,
            unit: "MICRO_DOLLAR",
        }, id);
        assertEquals((result.output as unknown[]).length, 2, id);
        // engine-stamped provider timing: one still-running poll + terminal
        assertEquals(result.timing.attempts, 2, id);
    }
});

Deno.test("apify: actor failure chain — synthesized 500, zero usage, digested error", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/run-failed.json`);
    const id = "apify#tweet-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200); // ours/theirs (D12)
    assertEquals(result.usage.units, []);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Actor exited with error");
    assert("raw" in output); // digest, never hide
});

Deno.test("apify: start-rejected chain — vendor 404 is DATA, digested", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/start-rejected.json`);
    const id = "apify#google-maps-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.units, []);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Actor was not found");
    assertEquals(output.type, "actor-not-found");
});

Deno.test("apify#linkedin-profile-search: pages reconstructed from LIVE run-record rates (finding 5)", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/pay-per-event.json`);
    const id = "apify#linkedin-profile-search";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // usageTotalUsd $0.04 at the LIVE $0.02 page rate ⇒ 2 pages; the baked
    // $0.05 fallback would have yielded 1 — proves the run-record read
    assertEquals(result.usage.units, [
        { amount: 2, unit: "PAGE" },
        { amount: 2, unit: "RESULT" },
    ]);
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 40_000,
        unit: "MICRO_DOLLAR",
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.searchPages, 2);
    assertEquals(output.profileCount, 2);
});

Deno.test("apify: PAY_PER_EVENT chain settles cost = usageTotalUsd for provider-default billing", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/pay-per-event.json`);
    const id = "apify#instagram-profile-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage.units, [{ amount: 2, unit: "RESULT" }]);
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 40_000,
        unit: "MICRO_DOLLAR",
    });
});

// ---------------------------------------------------------------------------
// doc surface: typed state + usage.model on every compiled doc
// ---------------------------------------------------------------------------

Deno.test("apify docs: every doc carries lifecycle.stateSchema + usage.model", async () => {
    const bundle = await testBundle();
    for (const id of await endpointIds()) {
        const doc = bundle.endpoints[id];
        assert(doc.lifecycle, `${id}: lifecycle missing`);
        assert(
            doc.lifecycle.stateSchema,
            `${id}: typed state (lifecycle.stateSchema) missing`,
        );
        assert(doc.usage.model, `${id}: usage.model missing`);
        assertEquals(doc.timeouts.pollMs, 2_000, id);
    }
});

// ---------------------------------------------------------------------------
// usage.estimate — the v1 EstimationLabel port, engine-executed (no IO)
// ---------------------------------------------------------------------------

async function estimateFor(id: string, body: RunInput["body"]) {
    const unit = await testSealedUnit(id);
    const engine = new Engine({
        // estimate is PURE — a transport that rejects proves no IO happens
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    });
    const loaded = await engine.load(unit);
    return loaded.estimate({ body });
}

/** The units a model BILLS (the card rows services multiplies): PER_CALL
 *  bills the flat charge (no measure); metered kinds bill their units. */
function billedUnits(model: UsageModel): string[] {
    switch (model.kind) {
        case "PER_CALL":
            return [];
        case "PER_UNIT":
        case "VARIANT":
            return [model.unit];
        case "COMPOSITE":
            return model.components
                .filter((component) => component.kind === "PER_UNIT")
                .map((component) => (component as { unit: string }).unit);
    }
}

Deno.test("apify estimates: the card invariant — estimate covers every billed unit, no IO", async () => {
    const bundle = await testBundle();
    for (const id of await endpointIds()) {
        const model = bundle.endpoints[id].usage.model;
        assert(model, `${id}: usage.model missing`);
        const estimated = await estimateFor(id, inputFor(id).body);
        for (const measure of estimated.units) {
            assert(measure.amount >= 0, id);
        }
        if (model.kind === "PER_CALL") {
            // nothing countable to predict — the flat charge is fully
            // described by the model + success (design D18)
            assertEquals(estimated.units, [], id);
            continue;
        }
        for (const unit of billedUnits(model)) {
            assert(
                estimated.units.some((measure) => measure.unit === unit),
                `${id}: estimate misses billed unit ${unit} — one card row ` +
                    `must price both the estimate and the settle`,
            );
        }
    }
});

Deno.test("apify settles: the card invariant + estimate accuracy (shared chain)", async () => {
    const bundle = await testBundle();
    const fixture = await loadFixture(`${HERE}fixtures/run-succeeded.json`);
    for (const id of await endpointIds()) {
        if (CUSTOM_BILLING.has(id.split("#")[1])) continue;
        const model = bundle.endpoints[id].usage.model;
        assert(model, id);
        const estimated = await estimateFor(id, inputFor(id).body);
        const settled = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        // every billed PER_UNIT unit is settled as a measure (PER_CALL
        // endpoints settle observation measures freely — billing reads the
        // MODEL, so nothing is asserted for the flat component)
        for (const unit of billedUnits(model)) {
            assert(
                settled.usage.units.some((measure) => measure.unit === unit),
                `${id}: settle misses billed unit ${unit}`,
            );
        }
        // v1 estimateAccuracy posture: visible, not asserted (the shared
        // chain is synthetic — 2 items regardless of the estimate input)
        console.log(
            `[estimate-accuracy] ${id}: estimated=${
                JSON.stringify(estimated.units)
            } settled=${JSON.stringify(settled.usage.units)}`,
        );
    }
});

Deno.test("apify estimates: label spot checks (v1 parity)", async () => {
    // LIMIT_IS_EXACT: maxItems IS the count
    assertEquals(
        (await estimateFor("apify#tweet-scraper", {
            searchTerms: ["a"],
            maxItems: 7,
        })).units,
        [{ amount: 7, unit: "RESULT" }],
    );
    // ONE_PER_QUERY: one per multiplier entry
    assertEquals(
        (await estimateFor("apify#instagram-profile-scraper", {
            usernames: ["a", "b", "c"],
        })).units,
        [{ amount: 3, unit: "RESULT" }],
    );
    // PER_QUERY_LIMIT: limit × queries
    assertEquals(
        (await estimateFor("apify#youtube-scraper", {
            searchQueries: ["x", "y"],
            maxResults: 4,
        })).units,
        [{ amount: 8, unit: "RESULT" }],
    );
    // FALLBACK_DEFAULT (v1 DEFAULT_ESTIMATED_RESULTS = 3) when nothing probes
    assertEquals(
        (await estimateFor("apify#tweet-scraper", { searchTerms: ["a"] }))
            .units,
        [{ amount: 3, unit: "RESULT" }],
    );
    // PER_CALL endpoints: the engine default — nothing countable, `[]`
    assertEquals(
        (await estimateFor("apify#tiktok-api", {
            type: "SEARCH",
            region: "US",
            url: "https://www.tiktok.com/@tiktok",
            keywords: ["deno"],
        })).units,
        [],
    );
    // linkedin-profile-search: page units (maxItems 2 → ceil(2/25) = 1 page)
    assertEquals(
        (await estimateFor("apify#linkedin-profile-search", {
            profileScraperMode: "Short",
            searchQuery: "deno developer",
            maxItems: 2,
        })).units,
        [
            { amount: 1, unit: "PAGE" },
            { amount: 2, unit: "RESULT" },
        ],
    );
});

// ---------------------------------------------------------------------------
// typed state: the doc's stateSchema rejects malformed state.data per tick
// ---------------------------------------------------------------------------

Deno.test("apify typed state: a poll fed corrupt state.data fails closed (INVALID_INPUT)", async () => {
    const unit = await testSealedUnit("apify#tweet-scraper");
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("must not reach the wire")),
        }),
    });
    const loaded = await engine.load(unit);
    let threw = false;
    try {
        await loaded.poll(inputFor("apify#tweet-scraper"), {
            externalRunId: "RUN1",
            data: { datasetId: 42 } as never, // schema says string
            timing: {
                startedAt: "2026-01-01T00:00:00.000Z",
                startRequestMs: 5,
                attempts: 0,
                pollMsTotal: 0,
                deadlineAt: "2026-01-01T00:05:00.000Z",
            },
        });
    } catch (error) {
        threw = true;
        assert(String(error).includes("INVALID_INPUT"), String(error));
    }
    assert(threw, "corrupt state.data must fail closed");
});
