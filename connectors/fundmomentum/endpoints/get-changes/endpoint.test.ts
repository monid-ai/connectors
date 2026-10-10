import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/get_changes happy (real recording): cursor fields + rows pass through, bills 1 credit", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_changes");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { limit: 5 } },
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
    assertEquals(output.since_defaulted, true);
    assertEquals(output.has_more, false);
    const changes = output.changes as Record<string, unknown>[];
    assertEquals(changes.length, 1);
    assertEquals(changes[0].slug, "cogenuity-partners");
});

Deno.test("fundmomentum#mcp/get_changes: limit bounds (1–200); since/if_none_match optional", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_changes");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [{ limit: 0 }, { limit: 201 }];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const passing: Json[] = [{}, { limit: 1 }, { limit: 200 }];
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
