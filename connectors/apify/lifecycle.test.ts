import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { flatCounts, type RunInput, type UsageModel } from "@shared/core";
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
const CUSTOM_BILLING = new Set(["harvestapi/linkedin-profile-search"]);

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
    const bundle = await testBundle();
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
        // the COMPLETE billed vector (design D24): the metered key settles
        // the dataset item count AND every flat component bills 1 —
        // engine-appended, so counts × rates = the whole bill
        const model = bundle.endpoints[id].usage.model!;
        const keys = billedKeys(model);
        assertEquals(
            result.usage.counts,
            {
                ...(keys.length === 1 ? { [keys[0]]: 2 } : {}),
                ...flatCounts(model),
            },
            id,
        );
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
    const id = "apify#apidojo/tweet-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200); // ours/theirs (D12)
    assertEquals(result.usage.counts, {});
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Actor exited with error");
    assert("raw" in output); // digest, never hide
});

Deno.test("apify: start-rejected chain — vendor 404 is DATA, digested", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/start-rejected.json`);
    const id = "apify#damilo/google-maps-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.counts, {});
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Actor was not found");
    assertEquals(output.type, "actor-not-found");
});

Deno.test("apify#harvestapi/linkedin-profile-search: pages reconstructed from LIVE run-record rates (finding 5)", async () => {
    const fixture = await loadFixture(`${HERE}fixtures/pay-per-event.json`);
    const id = "apify#harvestapi/linkedin-profile-search";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // usageTotalUsd $0.04 at the LIVE $0.02 page rate ⇒ 2 pages; the baked
    // $0.05 fallback would have yielded 1 — proves the run-record read.
    // "Short" mode ⇒ profiles are FREE: only the page component is counted
    // (the mode-selected profile keys stay absent — design D19)
    assertEquals(result.usage.counts, { "search-page": 2 });
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
    const id = "apify#apify/instagram-profile-scraper";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage.counts, { "RESULT": 2 });
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

/** The counts KEYS a model BILLS (the metered card rows services
 *  multiplies): PER_CALL bills the flat charge (no count); a leaf keys by
 *  its unit; a composite keys by its metered component ids (design D19). */
function billedKeys(model: UsageModel): string[] {
    switch (model.kind) {
        case "FREE":
        case "PER_CALL":
            return [];
        case "PER_UNIT":
            return [model.unit];
        case "COMPOSITE":
            return Object.entries(model.components)
                .filter(([, component]) => component.kind === "PER_UNIT")
                .map(([id]) => id);
        default:
            // EXHAUSTIVENESS: a new model kind fails `deno task check` here
            model satisfies never;
            throw new Error("unknown model kind");
    }
}

Deno.test("apify estimates: the card invariant — estimate covers every billed unit, no IO", async () => {
    const bundle = await testBundle();
    for (const id of await endpointIds()) {
        const model = bundle.endpoints[id].usage.model;
        assert(model, `${id}: usage.model missing`);
        const estimated = await estimateFor(id, inputFor(id).body);
        for (const amount of Object.values(estimated.counts)) {
            assert(amount >= 0, id);
        }
        const keys = billedKeys(model);
        const flat = flatCounts(model);
        // every flat component is promised at exactly 1 (engine-appended
        // complete vector — design D24)
        for (const [flatKey, one] of Object.entries(flat)) {
            assertEquals(
                estimated.counts[flatKey],
                one,
                `${id}: estimate misses flat key ${flatKey}`,
            );
        }
        if (keys.length === 0) {
            // flat-only doc: the vector IS the flat 1s (design D24)
            assertEquals(estimated.counts, flat, id);
            continue;
        }
        // the card invariant, key-shaped (design D19/D24): every estimated
        // key must be a billed one (same card row prices estimate + settle),
        // and a metered model must promise SOMETHING beyond the flat 1s.
        // Full metered coverage is only demanded of single-metered docs — a
        // multi-metered composite may legitimately promise a subset
        // (linkedin: the input mode SELECTS which profile component bills;
        // "Short" selects none).
        const meteredEstimated = Object.keys(estimated.counts)
            .filter((key) => !(key in flat));
        assert(
            meteredEstimated.length > 0,
            `${id}: estimate promises nothing for a metered model`,
        );
        for (const key of meteredEstimated) {
            assert(
                keys.includes(key),
                `${id}: estimate key ${key} is not billed by the model`,
            );
        }
        if (keys.length === 1) {
            assert(
                estimated.counts[keys[0]] !== undefined,
                `${id}: estimate misses billed key ${keys[0]} — one card ` +
                    `row must price both the estimate and the settle`,
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
        // every billed metered KEY is settled as a count (flat components
        // never appear — billing reads the MODEL + success)
        for (const key of billedKeys(model)) {
            assert(
                settled.usage.counts[key] !== undefined,
                `${id}: settle misses billed key ${key}`,
            );
        }
        // v1 estimateAccuracy posture: visible, not asserted (the shared
        // chain is synthetic — 2 items regardless of the estimate input)
        console.log(
            `[estimate-accuracy] ${id}: estimated=${
                JSON.stringify(estimated.counts)
            } settled=${JSON.stringify(settled.usage.counts)}`,
        );
    }
});

Deno.test("apify estimates: label spot checks (v1 parity)", async () => {
    // LIMIT_IS_EXACT: maxItems IS the count (leaf doc → unit-keyed)
    assertEquals(
        (await estimateFor("apify#apidojo/tweet-scraper", {
            searchTerms: ["a"],
            maxItems: 7,
        })).counts,
        { "RESULT": 7 },
    );
    // ONE_PER_QUERY: one per multiplier entry
    assertEquals(
        (await estimateFor("apify#apify/instagram-profile-scraper", {
            usernames: ["a", "b", "c"],
        })).counts,
        { "RESULT": 3 },
    );
    // PER_QUERY_LIMIT: limit × queries
    assertEquals(
        (await estimateFor("apify#streamers/youtube-scraper", {
            searchQueries: ["x", "y"],
            maxResults: 4,
        })).counts,
        { "RESULT": 8 },
    );
    // NO fallback constants (design D24): a body without the limiting knob
    // is REJECTED at validation — the estimate is deduced or the run never
    // starts (v1's DEFAULT_ESTIMATED_RESULTS = 3 posture is dead)
    {
        const unit = await testSealedUnit("apify#apidojo/tweet-scraper");
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({}),
                fetch: () => Promise.reject(new Error("no IO in estimate")),
            }),
        });
        const loaded = await engine.load(unit);
        let rejected = false;
        try {
            loaded.estimate({ body: { searchTerms: ["a"] } });
        } catch {
            rejected = true;
        }
        assert(rejected, "missing maxItems must reject, not fall back");
    }
    // flat-only endpoints: no estimate fn — the engine derives the whole
    // vector from the model (leaf PER_CALL → the reserved CALL key, D24)
    assertEquals(
        (await estimateFor("apify#scraptik/tiktok-api", {
            type: "SEARCH",
            region: "US",
            url: "https://www.tiktok.com/@tiktok",
            keywords: ["deno"],
        })).counts,
        { "CALL": 1 },
    );
    // linkedin-profile-search (maxItems 2 → ceil(2/25) = 1 page): "Short"
    // mode bills pages ONLY — no profile component selected (design D19)
    assertEquals(
        (await estimateFor("apify#harvestapi/linkedin-profile-search", {
            profileScraperMode: "Short",
            searchQuery: "deno developer",
            maxItems: 2,
        })).counts,
        { "search-page": 1 },
    );
    // the mode SELECTS the profile component: "Full" ⇒ full-profile
    assertEquals(
        (await estimateFor("apify#harvestapi/linkedin-profile-search", {
            profileScraperMode: "Full",
            searchQuery: "deno developer",
            maxItems: 2,
        })).counts,
        { "search-page": 1, "full-profile": 2 },
    );
    // …and "Full + email search" ⇒ full-profile-with-email
    assertEquals(
        (await estimateFor("apify#harvestapi/linkedin-profile-search", {
            profileScraperMode: "Full + email search",
            searchQuery: "deno developer",
            maxItems: 2,
        })).counts,
        { "search-page": 1, "full-profile-with-email": 2 },
    );
});

// ---------------------------------------------------------------------------
// typed state: the doc's stateSchema rejects malformed state.data per tick
// ---------------------------------------------------------------------------

Deno.test("apify typed state: a poll fed corrupt state.data fails closed (INVALID_INPUT)", async () => {
    const unit = await testSealedUnit("apify#apidojo/tweet-scraper");
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("must not reach the wire")),
        }),
    });
    const loaded = await engine.load(unit);
    let threw = false;
    try {
        await loaded.poll(inputFor("apify#apidojo/tweet-scraper"), {
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
