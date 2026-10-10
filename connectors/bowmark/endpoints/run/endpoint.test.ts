import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const SCRIPT = 'const page = await bowmark.read.page("https://example.com"); ' +
    "return { title: page.title, url: page.url };";

Deno.test("bowmark#run happy (recorded): status ok bills one run", async () => {
    const unit = await testSealedUnit("bowmark#run");
    const fixture = await loadFixture(`${fixturesDir}run-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { script: SCRIPT } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.04 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.ok, true);
    assertEquals(output.status, "ok");
    assertEquals(output.result, {
        url: "https://example.com/",
        title: "Example Domain",
    });
});

Deno.test("bowmark#run failed run (recorded): HTTP 200, status error, bills 0", async () => {
    const unit = await testSealedUnit("bowmark#run");
    const fixture = await loadFixture(`${fixturesDir}run-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { script: 'throw new Error("no such flight")' } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "error");
    assertEquals(output.result, null);
});

Deno.test("bowmark#run provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("bowmark#run");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-run.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { script: "return 1" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).ok, false);
});

Deno.test("bowmark#run: script required and non-empty; unknown keys rejected", async () => {
    const unit = await testSealedUnit("bowmark#run");
    const fixture = await loadFixture(`${fixturesDir}run-ok.json`);
    const rejected: Json[] = [{}, { script: "" }, { script: "x", bogus: 1 }];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
});

Deno.test({
    name: "bowmark#run live (gated on BOWMARK_API_KEY)",
    ignore: liveSkip("bowmark"),
    fn: async () => {
        const unit = await testSealedUnit("bowmark#run");
        const result = await runEndpoint({
            unit,
            input: { body: { script: "return 1 + 1" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(output.status, "ok");
        assertEquals(output.result, 2);
        assertEquals(result.usage.evidence, { RESULT: 1 });
    },
});
