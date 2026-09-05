import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#reddit-comment-scraper happy: async loop replay (recorded)", async () => {
    // fixture: recorded live, trimmed per the fixture diet (D11)
    const unit = await testSealedUnit("apify#reddit-comment-scraper");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                "postUrls": [
                    "https://www.reddit.com/r/programming/comments/1g5x1wz/",
                ],
                "maxComments": 2,
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
