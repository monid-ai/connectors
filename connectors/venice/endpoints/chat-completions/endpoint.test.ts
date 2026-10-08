import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "venice#chat/completions";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body = {
    model: "venice-uncensored-1-2",
    messages: [
        { role: "system", content: "Answer in one short sentence." },
        { role: "user", content: "What is the capital of Portugal?" },
    ],
    max_completion_tokens: 40,
    venice_parameters: { include_venice_system_prompt: false },
};

Deno.test(`${ID} happy (recorded): the vendor cost claim is the bill, cost stripped from output`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}chat-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // cost {usd: 0.0000126, diem: 0} → 12,600 nano-dollars of evidence;
    // the claim and the derived fold agree, so no mismatch rides out
    assertEquals(result.usage, {
        credits: { default: 0.0000126 },
        evidence: { CREDIT: 12600 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("cost" in output, false);
    const choices = output.choices as Record<string, unknown>[];
    const message = choices[0].message as Record<string, unknown>;
    assertEquals(message.content, "Lisbon is the capital of Portugal.");
});

Deno.test(`${ID} web search (recorded): the reported cost already includes augmentation`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "venice-uncensored-1-2",
                messages: [{
                    role: "user",
                    content: "What is the latest Deno release? One line.",
                }],
                max_completion_tokens: 60,
                venice_parameters: {
                    enable_web_search: "on",
                    include_venice_system_prompt: false,
                },
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}chat-web-search.json`),
    });
    assertEquals(result.isProviderError, false);
    // tokens + the $0.01 search line, reported by Venice as one number
    assertEquals(result.usage, {
        credits: { default: 0.0108378 },
        evidence: { CREDIT: 10837800 },
    });
});

Deno.test(`${ID} provider error (recorded 404): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "no-such-model",
                messages: [{ role: "user", content: "hi" }],
                max_completion_tokens: 10,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.message as string).startsWith("Specified model not found"),
        true,
    );
});

Deno.test(`${ID} schema gate: max_completion_tokens is required, a valid body passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}chat-ok.json`);
    const { max_completion_tokens: _, ...unbounded } = body;
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: unbounded },
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
                input: {
                    body: {
                        ...body,
                        venice_parameters: { enable_web_search: "always" },
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: the same body with a documented search mode passes
    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                ...body,
                venice_parameters: {
                    include_venice_system_prompt: false,
                    enable_web_search: "off",
                },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on VENICE_API_KEY)`,
    ignore: liveSkip("venice"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: one answer, a positive reported cost
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.choices), true);
        assertEquals((result.usage.credits.default ?? 0) > 0, true);
    },
});
