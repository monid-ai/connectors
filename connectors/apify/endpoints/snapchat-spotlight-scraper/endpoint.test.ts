import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#snapchat-spotlight-scraper happy: async loop replay (synthetic)", async () => {
    // fixture: synthetic until the actor's inputs can be recorded
    const unit = await testSealedUnit("apify#snapchat-spotlight-scraper");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                "spotlightUrls": [
                    "https://www.snapchat.com/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYaXNyaGF3Y2pxAZL2N1WMAZL2NjV0AAAAAA",
                ],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    assertEquals((result.output as unknown[]).length, 1);
});
