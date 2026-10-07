import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "scam-ai#v1/detections";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { url: "https://example.com/ai-portrait.png" } };
const VIDEO_INPUT = { body: { url: "https://example.com/interview-clip.mp4" } };

Deno.test(`${ID} happy (synthetic): an image run settles one credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // The vendor's meter says 1; the fold ceil(1 / 1) × 1 agrees: no mismatch.
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    // consolidate lifted credits_used out of the payload as the claim.
    const { credits_used: _settled, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} happy (synthetic): a video run settles per sampled frame`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-video-happy.json`,
    );
    const result = await runEndpoint({
        unit,
        input: VIDEO_INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 12 },
        evidence: { CREDIT: 12 },
    });
});

Deno.test(`${ID} happy (recorded): an image run preserves the response payload`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}recorded-image-happy.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const { credits_used: _settled, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(
        ((result.output as Record<string, Json>).media as Record<string, Json>)
            .type,
        "image",
    );
    assertEquals((result.output as Record<string, Json>).media, body.media);
    assertEquals(result.output, body);
});

Deno.test(`${ID} happy (recorded): a video run preserves the response payload`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}recorded-video-happy.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const { credits_used: _settled, ...body } = fixture.calls[0].res
        .body as Record<string, Json>;
    assertEquals(
        ((result.output as Record<string, Json>).media as Record<string, Json>)
            .type,
        "video",
    );
    assertEquals((result.output as Record<string, Json>).media, body.media);
    assertEquals(result.output, body);
});

Deno.test(`${ID}: a 200 without the vendor's meter fails instead of settling zero`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    delete (fixture.calls[0].res.body as Record<string, Json>).credits_used;
    await assertRejects(
        () => runEndpoint({ unit, input: INPUT, mode: "replay", fixture }),
        Error,
        "$.credits_used",
    );
});

Deno.test(`${ID} provider error (synthetic 402): zero usage, digested body`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.code, "INSUFFICIENT_CREDITS");
    assertEquals(typeof output.message, "string");
});

Deno.test(`${ID} input gate: only a public https URL passes`, async () => {
    const unit = await testSealedUnit(ID);
    const bad: Json[] = [
        {},
        { url: "http://insecure.example.com/frame.png" },
        { url: 42 },
        { url: "https://example.com/a.png", extra: true },
    ];
    for (const body of bad) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: `${ID} live (gated on SCAM_AI_API_KEY)`,
    ignore: liveSkip("scam-ai"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/JPEG_example_flower.jpg",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["CREDIT"]);
        const output = result.output as Record<string, Json>;
        assertEquals(
            ["LIKELY_REAL", "ALERT", "LIKELY_AI"].includes(
                output.verdict as string,
            ),
            true,
            JSON.stringify(result.output),
        );
    },
});
