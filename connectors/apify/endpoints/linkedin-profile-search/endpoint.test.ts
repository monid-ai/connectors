import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "apify#linkedin-profile-search";

Deno.test("apify#linkedin-profile-search happy (recorded): page-basis billing via the leaf-wise overrides", async () => {
    const unit = await testSealedUnit(ID);
    // the override showcase: custom poll + consolidate, inherited start/stop
    assert(unit.doc.lifecycle?.poll && unit.doc.lifecycle.stop);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                profileScraperMode: "Short",
                searchQuery: "deno developer",
                maxItems: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // billing basis = SEARCH PAGES (v1 parity: a zero-profile run still
    // bills its ≥1 charged page); profiles ride as a second measure.
    // Recorded reality: usageTotalUsd lags to 0 → the floor clamp (1 page).
    assertEquals(result.usage.units, [
        { amount: 1, unit: "page" },
        { amount: 2, unit: "result" },
    ]);
    // PAY_PER_EVENT with the lagging $0 total — cost READ, not computed
    assertEquals(result.usage.cost, {
        currency: "USD",
        value: 0,
        unit: "MICRO_DOLLAR",
    });
    assertEquals(result.usage.evidence?.searchPages, 1);
    assertEquals(result.usage.evidence?.profileCount, 2);
    // the poll override stamps the billed meters ONTO the output
    const output = result.output as {
        searchPages: number;
        profileCount: number;
        profiles: unknown[];
    };
    assertEquals(output.searchPages, 1);
    assertEquals(output.profileCount, 2);
    assertEquals(output.profiles.length, 2);
});

Deno.test("apify#linkedin-profile-search: profileScraperMode is REQUIRED (the v1 admission rule, declarative)", async () => {
    const unit = await testSealedUnit(ID);
    const required = unit.doc.input.schema.body?.required as string[];
    assert(required.includes("profileScraperMode"));
});
