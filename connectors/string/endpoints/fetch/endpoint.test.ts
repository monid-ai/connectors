import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("string#fetch happy: request_standard settles at the request-standard line", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(`${fixturesDir}synthetic-fetch-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://httpbin.org/json" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0002 },
        evidence: { request_standard: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.data as Record<string, unknown>).message,
        "Hello World",
    );
});

Deno.test("string#fetch happy: browser_premium settles at the browser-premium line, not the cheap-floor estimate", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-browser-premium.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.test", executeJS: true } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.isProviderError, false);
    // settle reflects the ACTUAL billed type from the response header, not
    // the estimate's cheaper-standard-proxy floor for a browser-forced call
    assertEquals(result.usage, {
        credits: { default: 0.004 },
        evidence: { browser_premium: 1 },
    });
});

Deno.test("string#fetch happy: absent billed-type header settles zero usage, not a guess", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-header-absent.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://httpbin.org/json" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#fetch happy: unrecognized billed-type header settles zero usage, not a guess", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-header-unrecognized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://httpbin.org/json" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#fetch provider error (synthetic 502): zero usage", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://httpbin.org/json" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#fetch: url must be http(s) with a host; method accepts any case", async () => {
    const unit = await testSealedUnit("string#fetch");
    const fixture = await loadFixture(`${fixturesDir}synthetic-fetch-ok.json`);
    const rejected: Json[] = [
        {},
        { url: "ftp://example.test/file" },
        { url: "https://" },
        { url: "https:///path" },
        { url: "https://example.test", method: "TRACE" },
        { url: "https://example.test", notAField: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // near-valid twins: any case, and every method the vendor accepts
    for (const method of ["get", "Delete", "head", "OPTIONS"]) {
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.test", method } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false, method);
    }
});

Deno.test("string#fetch: jsonSchema is not exposed on the input schema", async () => {
    const unit = await testSealedUnit("string#fetch");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assertEquals("jsonSchema" in properties, false);
});

Deno.test({
    name: "string#fetch live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#fetch");
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://httpbin.org/json" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // whichever line fired, exactly one component should have settled
        const evidenceKeys = Object.keys(result.usage.evidence);
        assertEquals(evidenceKeys.length, 1);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
