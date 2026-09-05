import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#tweet-scraper happy (recorded): tweets scraped through the async loop", async () => {
    const unit = await testSealedUnit("apify#tweet-scraper");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                searchTerms: ["monid.ai"],
                maxItems: 3,
                sort: "Latest",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // recorded 3 tweets; fixture trimmed to the first 2 (fixture-diet D11)
    assertEquals(result.usage.units, [{ amount: 2, unit: "result" }]);
    assertEquals((result.output as unknown[]).length, 2);
});
