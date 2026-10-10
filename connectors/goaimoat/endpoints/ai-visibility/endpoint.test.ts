import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("goaimoat#ai-visibility happy: returns a diagnosis for the brand", async () => {
    const unit = await testSealedUnit("goaimoat#ai-visibility");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { brand_name: "GoAI Moat" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.brand_name, "GoAI Moat");
    assertEquals(
        output.core_thesis,
        "Being good is no longer enough — you have to be *sayable by AI*.",
    );
});

Deno.test("goaimoat#ai-visibility provider error: digested envelope, zero usage", async () => {
    const unit = await testSealedUnit("goaimoat#ai-visibility");
    const fixture = await loadFixture(`${fixturesDir}synthetic-provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { brand_name: "GoAI Moat" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).error,
        "internal server error",
    );
});

Deno.test("goaimoat#ai-visibility schema gate: brand_name is required", async () => {
    const unit = await testSealedUnit("goaimoat#ai-visibility");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (const bad of [{}, { category: "phone case" }]) {
        await assertRejects(() =>
            runEndpoint({ unit, input: { body: bad }, mode: "replay", fixture }),
        );
    }
});

Deno.test("goaimoat#ai-visibility schema gate: score is bounded 0-30", async () => {
    const unit = await testSealedUnit("goaimoat#ai-visibility");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (const bad of [{ brand_name: "GoAI Moat", score: -1 }, { brand_name: "GoAI Moat", score: 31 }]) {
        await assertRejects(() =>
            runEndpoint({ unit, input: { body: bad }, mode: "replay", fixture }),
        );
    }
});
