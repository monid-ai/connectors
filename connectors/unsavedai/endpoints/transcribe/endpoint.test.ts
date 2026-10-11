import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("unsavedai#transcribe happy: cost_usd claim agrees with 60 billed seconds × $0.00005", async () => {
    const unit = await testSealedUnit("unsavedai#transcribe");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/JFK_inaugural_address.ogg",
                max_minutes: 1,
                include: ["segments"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.003 },
        evidence: { seconds: 60, speaker_seconds: 0 },
    });
    assert(!("usage" in (result.output as Record<string, unknown>)));
});

Deno.test("unsavedai#transcribe web page: provider error, zero usage", async () => {
    const unit = await testSealedUnit("unsavedai#transcribe");
    const fixture = await loadFixture(`${fixturesDir}not-media.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { url: "https://www.tiktok.com/@nasa", max_minutes: 1 },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("unsavedai#transcribe schema gate: max_minutes is required and capped at 30", async () => {
    const unit = await testSealedUnit("unsavedai#transcribe");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const url =
        "https://upload.wikimedia.org/wikipedia/commons/d/d5/JFK_inaugural_address.ogg";
    const bodies: Record<string, string | number>[] = [
        { url },
        { url, max_minutes: 31 },
    ];
    for (const body of bodies) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // max_minutes 30 passes validation: replay serves the recorded happy
    // response instead of rejecting the input
    const twin = await runEndpoint({
        unit,
        input: { body: { url, max_minutes: 30 } },
        mode: "replay",
        fixture,
    });
    assertEquals(twin.httpStatus, 200);
});

Deno.test({
    name: "unsavedai#transcribe live (gated on UNSAVEDAI credentials)",
    ignore: liveSkip("unsavedai"),
    fn: async () => {
        const unit = await testSealedUnit("unsavedai#transcribe");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/JFK_inaugural_address.ogg",
                    max_minutes: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const evidence = result.usage.evidence as Record<string, number>;
        assert(evidence.seconds > 0, JSON.stringify(evidence));
        assertEquals(typeof evidence.speaker_seconds, "number");
    },
});

Deno.test("unsavedai#transcribe speakers: the add-on line bills the same seconds", async () => {
    const unit = await testSealedUnit("unsavedai#transcribe");
    const fixture = await loadFixture(`${fixturesDir}speakers.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://images-assets.nasa.gov/video/Explore%20our%20Home%20Planet%20and%20the%20Universe%20With%20NASA%20Podcasts/Explore%20our%20Home%20Planet%20and%20the%20Universe%20With%20NASA%20Podcasts~mobile.mp4",
                max_minutes: 2,
                include: ["speakers", "segments"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { seconds: 63, speaker_seconds: 63 });
    const credits = (result.usage.credits as Record<string, number>).default;
    assert(
        Math.abs(credits - 63 * (0.00005 + 0.00003)) < 1e-9,
        `credits ${credits}`,
    );
});
