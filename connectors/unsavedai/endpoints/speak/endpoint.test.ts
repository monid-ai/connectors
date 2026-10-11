import { assert, assertEquals, assertRejects } from "@std/assert";
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
    assertEquals(result.usage, {
        credits: { default: 0.00085 },
        evidence: { CHARACTER: TEXT.length },
    });
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

Deno.test("unsavedai#speak schema gate: over 5,000 characters is rejected, 5,000 passes it", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { text: "a".repeat(5001), voice: "af_heart" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the 5,000-character twin passes validation: replay serves the recorded
    // happy response instead of rejecting the input
    const twin = await runEndpoint({
        unit,
        input: { body: { text: "a".repeat(5000), voice: "af_heart" } },
        mode: "replay",
        fixture,
    });
    assertEquals(twin.httpStatus, 200);
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
        const output = result.output as Record<string, unknown>;
        assert(String(output.audio_url).startsWith("https://"));
        assert(typeof output.expires_at === "string");
        const evidence = result.usage.evidence as Record<string, number>;
        assertEquals(typeof evidence.CHARACTER, "number");
    },
});
