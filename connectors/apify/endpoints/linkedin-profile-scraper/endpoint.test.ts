import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { replayFetch } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "apify#linkedin-profile-scraper";

Deno.test("apify doc shape: lifecycle fused from the provider, 0.2.0 floor, ONE shared fn set", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.minEngineVersion, "0.2.0");
    assertEquals(unit.doc.timeouts, {
        requestMs: 30_000,
        runMs: 300_000,
        pollMs: 2_000,
    });
    assert(unit.doc.lifecycle, "lifecycle must be fused from the provider");
    assert(unit.doc.lifecycle.poll && unit.doc.lifecycle.stop);
    // interning payoff: every apify endpoint points at the SAME provider
    // lifecycle + consolidate entries (one fnTable entry each)
    const bundle = await testBundle();
    const apifyDocs = Object.values(bundle.endpoints)
        .filter((doc) => doc.provider === "apify");
    assert(apifyDocs.length >= 5);
    for (const doc of apifyDocs) {
        assertEquals(
            doc.lifecycle?.start.$fn.key,
            unit.doc.lifecycle.start.$fn.key,
        );
        assertEquals(
            doc.usage.consolidate.$fn.key,
            unit.doc.usage.consolidate.$fn.key,
        );
    }
});

Deno.test("apify#linkedin-profile-scraper happy (recorded): start → poll×3 → dataset → settle", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                profileUrls: ["https://www.linkedin.com/in/satyanadella"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // units = dataset item count (the v1 billing basis)
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    // PAY_PER_EVENT: cost READ from the run record's usageTotalUsd (which
    // Apify reports as 0 right at completion — recorded reality, v1 parity)
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 0,
        unit: "MICRO_DOLLAR",
    });
    // evidence: billing signals threaded through STATE from the poll tick
    assertEquals(result.usage.evidence?.pricingModel, "PAY_PER_EVENT");
    assertEquals(result.usage.evidence?.runId, "Fzmln12xWJioVawSa");
    // output = the BARE dataset item array
    const output = result.output as Array<Record<string, unknown>>;
    assertEquals(output.length, 1);
    assert("linkedinUrl" in output[0] || "fullName" in output[0]);
});

Deno.test("apify#linkedin-profile-scraper invalid URL (recorded): actor SUCCEEDS with an error item — 1 result billed", async () => {
    // Recorded reality: this actor tolerates garbage input and returns an
    // error ITEM in the dataset — the run is a vendor success, and dataset
    // items are the billing basis (exactly v1's actorRunBilling).
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}invalid-url.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { profileUrls: ["not-a-linkedin-url"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    const output = result.output as Array<Record<string, unknown>>;
    assertEquals(output[0].error, "Invalid Linkedin URL.");
});

Deno.test("apify#linkedin-profile-scraper actor failure: fn-synthesized 500, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-actor-failed.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: { profileUrls: ["https://www.linkedin.com/in/nobody"] },
        },
        mode: "replay",
        fixture,
    });
    // in-body vendor failure (exit code ≠ 0): the poll fn synthesizes a 500
    // envelope; the engine classifies + zero-bills it (v1: recorded observed
    // cost, never billed — v2 policy: vendor error ⇒ zero usage, period)
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
    assertEquals(result.usage.cost, undefined);
    assertEquals(result.output, {
        message: "Actor run failed: browser could not start",
    });
});

Deno.test("apify#linkedin-profile-scraper provider error: 401 at start is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: { profileUrls: ["https://www.linkedin.com/in/anyone"] },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.units, [{ amount: 0, unit: "call" }]);
    // raw Apify error body passes through untouched
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.error.type, "token-not-found");
});

Deno.test("apify#linkedin-profile-scraper stop: best-effort abort, failures swallowed", async () => {
    const unit = await testSealedUnit(ID);
    const input = {
        body: { profileUrls: ["https://www.linkedin.com/in/anyone"] },
    };
    // abort accepted
    {
        const fixture = await loadFixture(`${fixturesDir}synthetic-abort.json`);
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: replayFetch(fixture),
            }),
        });
        const loaded = await engine.load(unit);
        await loaded.stop(input, { runId: "STOPRUN1" });
    }
    // transport failure — swallowed (best-effort contract)
    {
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: () => Promise.reject(new TypeError("net down")),
            }),
        });
        const loaded = await engine.load(unit);
        await loaded.stop(input, { runId: "STOPRUN1" });
    }
});
