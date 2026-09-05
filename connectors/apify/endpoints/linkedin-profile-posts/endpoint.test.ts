import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#linkedin-profile-posts happy: async loop replay (recorded)", async () => {
    // fixture: recorded live, trimmed per the fixture diet (D11)
    const unit = await testSealedUnit("apify#linkedin-profile-posts");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                "targetUrls": [
                    "https://www.linkedin.com/in/satyanadella",
                ],
                "maxPosts": 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 2, unit: "result" }]);
    assertEquals((result.output as unknown[]).length, 2);
});
