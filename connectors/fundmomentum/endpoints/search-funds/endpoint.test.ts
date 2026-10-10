import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/search_funds happy (real recording): unwraps content[0].text array, bills 1 credit", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", country: "Germany", limit: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as unknown[];
    assertEquals(output.length, 1);
    assertEquals(
        (output[0] as Record<string, unknown>).slug,
        "alstin-iii",
    );
});

Deno.test("fundmomentum#mcp/search_funds: limit bounds (1–20)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [{ limit: 0 }, { limit: 21 }];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const passing: Json[] = [{}, { limit: 1 }, { limit: 20 }, {
        stage: "pre_seed",
        industry: "ai_ml",
    }];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});
