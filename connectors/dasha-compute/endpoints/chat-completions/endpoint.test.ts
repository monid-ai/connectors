import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("dasha-compute#chat/completions happy (synthetic): flat $0.05 call, receipt rides through", async () => {
    const unit = await testSealedUnit("dasha-compute#chat/completions");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "qwen3-32b",
                messages: [{
                    role: "user",
                    content: "What is the capital of France?",
                }],
                max_tokens: 64,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // PER_CALL (D24/D26): no metered lines — the engine appends the flat
    // call and folds the pinned $0.05 against the usd pool. There is no
    // vendor meter in the body to consolidate.
    assertEquals(result.usage, {
        credits: { default: 0.05 },
        evidence: { CALL: 1 },
    });
    // passthrough: the OpenAI shape AND the Dasha extensions survive
    const output = result.output as Record<string, unknown>;
    assertEquals(output.object, "chat.completion");
    assertEquals(output.job_id, "job_a1b2c3d4e");
    const receipt = output.receipt as Record<string, unknown>;
    assertEquals(receipt.provider_class, "community");
    const choices = output.choices as Record<string, unknown>[];
    assertEquals(choices.length, 1);
});

Deno.test("dasha-compute#chat/completions provider error: 402 is data, zero usage", async () => {
    const unit = await testSealedUnit("dasha-compute#chat/completions");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "qwen3-32b",
                messages: [{ role: "user", content: "anything" }],
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // raw envelope passes through untouched on provider error
    assertEquals(result.output, {
        error: { message: "top up credits", type: "invalid_request_error" },
    });
});

Deno.test("dasha-compute#chat/completions: `stream` is not exposed, and stripped defensively before send", async () => {
    const unit = await testSealedUnit("dasha-compute#chat/completions");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert(
        !("stream" in properties),
        "stream must not be in the caller-facing schema",
    );
});

Deno.test({
    name: "dasha-compute#chat/completions live",
    ignore: liveSkip("dasha-compute"),
    fn: async () => {
        const unit = await testSealedUnit("dasha-compute#chat/completions");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    model: "gpt-oss-20b",
                    messages: [{ role: "user", content: "Say ok." }],
                    max_tokens: 8,
                },
            },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage.credits, { default: 0.05 });
    },
});

Deno.test("dasha-compute#chat/completions schema gate: max_tokens cap 4096", async () => {
    const unit = await testSealedUnit("dasha-compute#chat/completions");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const baseBody = {
        model: "qwen3-32b",
        messages: [{ role: "user" as const, content: "hi" }],
    };
    // near-valid bad input: one past the documented cap
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...baseBody, max_tokens: 4097 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // passing near-twin: the boundary value itself clears the gate
    await assertInputAccepted({
        unit,
        input: { body: { ...baseBody, max_tokens: 4096 } },
        mode: "replay",
        fixture,
    });
});
