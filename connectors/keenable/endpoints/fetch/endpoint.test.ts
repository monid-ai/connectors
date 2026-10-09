import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable#v1/fetch happy (synthetic): one credit; fold settles; markdown content", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch");
    const fixture = await loadFixture(`${fixturesDir}synthetic-fetch-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("costDollars" in output, false);
    assertEquals(output.url, "https://example.com/");
    assertEquals(output.title, "Example Domain");
    assert(
        typeof output.content === "string" &&
            (output.content as string).includes("Example Domain"),
        "markdown content present",
    );
});

Deno.test("keenable#v1/fetch provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-fetch.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "Authentication failed",
        message: "Malformed API key",
    });
});

Deno.test("keenable#v1/fetch: url required; prompt bounded; live accepted; unknown keys rejected", async () => {
    const unit = await testSealedUnit("keenable#v1/fetch");
    const fixture = await loadFixture(`${fixturesDir}synthetic-fetch-ok.json`);
    const rejected: Record<string, Json>[] = [
        {},
        { url: "not-a-url" },
        { url: "https://example.com", max_chars: 0 },
        { url: "https://example.com", prompt: "x".repeat(2001) },
        { url: "https://example.com", live: "yes" },
        { url: "https://example.com", bogus: 1 },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    }
    // passing near-twins. Extra query params change the GET URL, so each
    // bound twin has its own fixture.
    const okUrl = await runEndpoint({
        unit,
        input: { queryParams: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(okUrl.isProviderError, false);

    const maxCharsFixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-max-chars.json`,
    );
    const okMax = await runEndpoint({
        unit,
        input: {
            queryParams: { url: "https://example.com", max_chars: 1 },
        },
        mode: "replay",
        fixture: maxCharsFixture,
    });
    assertEquals(okMax.isProviderError, false);

    const promptFixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-prompt.json`,
    );
    const okPrompt = await runEndpoint({
        unit,
        input: {
            queryParams: {
                url: "https://example.com",
                prompt: "x".repeat(2000),
            },
        },
        mode: "replay",
        fixture: promptFixture,
    });
    assertEquals(okPrompt.isProviderError, false);

    const liveFixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-live.json`,
    );
    const okLive = await runEndpoint({
        unit,
        input: { queryParams: { url: "https://example.com", live: true } },
        mode: "replay",
        fixture: liveFixture,
    });
    assertEquals(okLive.isProviderError, false);
    assertEquals(okLive.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test({
    name: "keenable#v1/fetch live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/fetch");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["CALL"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.content, "string");
    },
});
