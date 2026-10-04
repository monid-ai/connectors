import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testBundle, testSealedUnit } from
    "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("court-rules: compiled urls and the FREE model", async () => {
    const bundle = await testBundle();
    const judges = bundle.endpoints["court-rules#api/v1/judges"];
    const holidays = bundle.endpoints["court-rules#api/v1/holidays"];
    assertEquals(
        judges.request.url,
        "https://api.courtrules.app/api/v1/judges",
    );
    assertEquals(
        holidays.request.url,
        "https://api.courtrules.app/api/v1/holidays",
    );
    // FREE provider (design D27): no vendor meter, so no consolidate fn
    // compiles, and both quantities slots on both docs are the one
    // compiler-synthesized empty-counts entry.
    assertEquals(judges.usage.consolidate, undefined);
    assertEquals(holidays.usage.consolidate, undefined);
    const key = judges.usage.evidence.$fn.key;
    assertEquals(judges.usage.estimate.$fn.key, key);
    assertEquals(holidays.usage.evidence.$fn.key, key);
    assertEquals(
        bundle.fnTable[key].provenance,
        "core#usage.synthesizedEmpty",
    );
});

Deno.test("court-rules#api/v1/judges happy (synthetic): FREE, zero usage", async () => {
    const unit = await testSealedUnit("court-rules#api/v1/judges");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { district_id: "edny", limit: 25 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model (design D26): nothing folds, nothing is evidenced.
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // No output projection on this doc: the fixture body IS the contract.
    assertEquals(result.output, fixture.calls[0].res.body);
});
