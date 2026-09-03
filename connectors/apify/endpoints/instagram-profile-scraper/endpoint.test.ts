import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("apify#instagram-profile-scraper happy (recorded): profile scraped through the async loop", async () => {
    const unit = await testSealedUnit("apify#instagram-profile-scraper");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { usernames: ["instagram"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.units, [{ amount: 1, unit: "result" }]);
    assertEquals(result.usage.evidence?.pricingModel, "PAY_PER_EVENT");
    const output = result.output as Array<Record<string, unknown>>;
    assertEquals(output.length, 1);
    assert("username" in output[0]);
});
