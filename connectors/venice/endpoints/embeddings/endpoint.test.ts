import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "venice#embeddings";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body = {
    model: "text-embedding-bge-m3",
    input: ["privacy-first AI", "uncensored inference"],
};

Deno.test(`${ID} happy (recorded): prompt_tokens on the model's line, no vendor claim`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}embeddings-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 14 tokens × $0.15 / 1M on the bge-m3 line; `cost: null` is no claim
    assertEquals(result.usage, {
        credits: { default: 14 * 0.00000015 },
        evidence: { tier_15: 14 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Array.isArray(output.data), true);
});

Deno.test(`${ID} provider error (429): no usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: {
            name: "synthetic-embeddings-rate-limited",
            description: "A Venice 429 must not bill embedding usage.",
            calls: [{
                req: { method: "POST", url: unit.doc.request.url },
                res: { status: 429, body: { error: "rate limit exceeded" } },
            }],
        },
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "rate limit exceeded");
});

Deno.test(`${ID} schema gate: unknown model and token arrays are rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}embeddings-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...body, model: "text-embedding-ada-002" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...body, input: [[101, 2023]] } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // Passing near-twin: a single string is also a valid embedding input.
    const accepted = await estimateEndpoint(unit, {
        body: { ...body, input: "hello" },
    });
    assertEquals(accepted.evidence, { tier_15: 5 });
});

Deno.test({
    name: `${ID} live (gated on VENICE_API_KEY)`,
    ignore: liveSkip("venice"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { model: "text-embedding-bge-m3", input: "hi" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals((result.usage.evidence.tier_15 ?? 0) > 0, true);
    },
});
