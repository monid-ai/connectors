import { assert, assertEquals } from "@std/assert";
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
        evidence: { SECOND: 60 },
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
        assertEquals(result.usage.evidence, { SECOND: 60 });
    },
});
