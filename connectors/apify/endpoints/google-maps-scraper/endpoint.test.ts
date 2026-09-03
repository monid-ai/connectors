import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#google-maps-scraper happy (recorded): listings scraped through the async loop", async () => {
    const unit = await testSealedUnit("apify#google-maps-scraper");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "coffee shop",
                location: "Palo Alto, CA",
                max_results: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // recorded reality: the actor returned 20 listings despite max_results 3
    // (dataset items are the billing basis); the FIXTURE is trimmed to the
    // first 2 (fixture-diet, design D11) — replay bills the trimmed reality
    assertEquals(result.usage.units, [{ amount: 2, unit: "result" }]);
    assertEquals((result.output as unknown[]).length, 2);
});
