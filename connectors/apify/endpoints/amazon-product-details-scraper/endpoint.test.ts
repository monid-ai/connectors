import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#amazon-product-details-scraper happy: async loop replay (recorded)", async () => {
    // fixture: recorded live, trimmed per the fixture diet (D11)
    const unit = await testSealedUnit("apify#amazon-product-details-scraper");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                "Params": [
                    {
                        "url": "https://www.amazon.com/dp/B08N5WRWNW",
                    },
                ],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 0, unit: "result" }]);
    assertEquals((result.output as unknown[]).length, 0);
});
