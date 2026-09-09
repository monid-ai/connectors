import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("octen#embedding happy (recorded): tokens land under the MODE-selected line", async () => {
    const unit = await testSealedUnit("octen#embedding");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { input: ["hello world"], model: "octen-embedding-0.6b" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // mode-selected composite (D19/D26): the receipt's input tokens are
    // keyed by the SELECTED model's line; the 0.6b line bills 10 credits
    // per 1M tokens, so 3 tokens fold to one whole increment = 10. The
    // vendor's meta.usage receipt stays in the RAW run record.
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { embedding_0_6b: 3 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals("usage" in output.meta, false);
});

Deno.test({
    name: "octen#embedding live (gated on OCTEN_API_KEY)",
    ignore: liveSkip("octen"),
    fn: async () => {
        const unit = await testSealedUnit("octen#embedding");
        const result = await runEndpoint({
            unit,
            // pin a model: the vendor's server-side default (4b) has been
            // observed to 500 while 0.6b/8b work
            input: {
                body: {
                    input: ["hello world"],
                    model: "octen-embedding-0.6b",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["embedding_0_6b"]);
    },
});
