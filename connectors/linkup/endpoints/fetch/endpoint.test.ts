import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "linkup#fetch";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): standard fetch bills the $0.001 line`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no vendor meter: the derived fold IS the bill (mode/renderJs
    // defaulted at the binding)
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { standard: 1 },
    });
    const output = result.output as { markdown: string };
    assertEquals(typeof output.markdown, "string");
});

Deno.test(`${ID}: mode × renderJs selects the line, schema adds the surcharge`, async () => {
    const unit = await testSealedUnit(ID);
    // replay matches method + url, so one chain serves every price cell
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (body: Record<string, Json>) =>
        runEndpoint({
            unit,
            input: { body: { url: "https://example.com", ...body } },
            mode: "replay",
            fixture,
        });

    assertEquals((await run({ renderJs: true })).usage, {
        credits: { default: 0.005 },
        evidence: { standard_render_js: 1 },
    });
    assertEquals((await run({ mode: "pro" })).usage, {
        credits: { default: 0.005 },
        evidence: { pro: 1 },
    });
    const proJsSchema = await run({
        mode: "pro",
        renderJs: true,
        schema: { type: "object", properties: { title: { type: "string" } } },
    });
    assertEquals(proJsSchema.usage.evidence, {
        pro_render_js: 1,
        structured_output: 1,
    });
    // $0.01 + $0.001, up to float fold
    const total = proJsSchema.usage.credits.default ?? 0;
    assertEquals(Math.abs(total - 0.011) < 1e-9, true, String(total));
});

Deno.test(`${ID} estimate: the same cell the settle bills`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, { body: { url: "https://example.com" } }),
        { credits: { default: 0.001 }, evidence: { standard: 1 } },
    );
    const est = await estimateEndpoint(unit, {
        body: {
            url: "https://example.com",
            schema: { type: "object" },
        },
    });
    assertEquals(est.evidence, { standard: 1, structured_output: 1 });
});

Deno.test(`${ID} provider error: 401 is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com/x" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Unauthorized action",
    );
});

Deno.test(`${ID}: strict body — unknown keys and bad values never reach the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bodies: Json[] = [
        {},
        { url: "not a url" },
        { url: "https://example.com", mode: "max" },
        { url: "https://example.com", render_js: true },
    ];
    for (const body of bodies) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: `${ID} live (gated on LINKUP_API_KEY)`,
    ignore: liveSkip("linkup"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { default: 0.001 },
            evidence: { standard: 1 },
        });
        const output = result.output as { markdown: string };
        assertEquals(output.markdown.length > 0, true);
    },
});
