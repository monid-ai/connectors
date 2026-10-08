import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "unsavedai#speak";
const TEXT =
    "Hello from UnsavedAI. This short sentence is read aloud by the Kokoro voice af_heart.";

Deno.test("unsavedai#speak happy: cost_usd claim agrees with billed characters × $0.00001", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { text: TEXT, voice: "af_heart" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { CHARACTER: TEXT.length });
    const credits = (result.usage.credits as Record<string, number>).default;
    assert(
        Math.abs(credits - TEXT.length * 0.00001) < 1e-9,
        `credits ${credits}`,
    );
    const output = result.output as Record<string, unknown>;
    assert(!("usage" in output));
    assert(
        String(output.audio_url).startsWith(
            "https://tools.unsavedai.com/v1/speak/audio/",
        ),
    );
    assert(!("audio_base64" in output));
});

Deno.test("unsavedai#speak text with nothing to speak: provider error, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}nothing-to-speak.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { text: "\u0001\u0002" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "unsavedai#speak live (gated on UNSAVEDAI credentials)",
    ignore: liveSkip("unsavedai"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { text: "Live check.", voice: "bm_george" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, {
            CHARACTER: "Live check.".length,
        });
    },
});
