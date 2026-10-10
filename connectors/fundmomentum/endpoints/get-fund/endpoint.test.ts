import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/get_fund happy (real recording): unwraps content[0].text, bills 1 credit", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_fund");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { slug: "alstin-iii" } },
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
    assertEquals(output.slug, "alstin-iii");
    assertEquals(output.name, "Alstin III");
    // the MCP envelope and its billing bookkeeping never reach the caller
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
});

Deno.test("fundmomentum#mcp/get_fund not_found (real recording): JSON-RPC body error on HTTP 200 synthesizes 404, zero usage", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_fund");
    const fixture = await loadFixture(`${fixturesDir}notfound.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { slug: "no-such-fund-at-all-zzz" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    const error = output.error as Record<string, unknown>;
    assertEquals(error.code, -32000);
    const data = error.data as Record<string, unknown>;
    assertEquals(data.error_reason, "not_found");
});

Deno.test("fundmomentum#mcp/get_fund unauthorized (real recording): real 401 relayed untouched, zero usage", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_fund");
    const fixture = await loadFixture(`${fixturesDir}unauthorized.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { slug: "alstin-iii" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    const error = output.error as Record<string, unknown>;
    assertEquals(error.code, -32001);
});

Deno.test("fundmomentum#mcp/get_fund: slug required", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_fund");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [{}, { slug: "" }];
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
