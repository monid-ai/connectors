import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "apify#youtube-video-transcript";

Deno.test("apify#youtube-video-transcript happy (recorded): transcript through the async loop", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                youtube_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
                language: "en",
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

Deno.test({
    // live smoke for the WHOLE async pipeline (cheapest actor in the set)
    name: "apify#youtube-video-transcript live (gated on APIFY_API_KEY)",
    ignore: liveSkip("apify"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    youtube_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
                    language: "en",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.units[0]?.unit, "result");
        assert(result.usage.units[0]!.amount >= 1);
    },
});
