import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "stealthgpt#api/stealthify/detect";
const TEXT =
    "Renewable energy sources, including solar and wind power, represent inexhaustible resources unlike finite fossil fuels.";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("stealthgpt#api/stealthify/detect: settles the vendor's wordsSpent; score rides through, meter stripped", async () => {
    const result = await run("detect.json", { text: TEXT });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 15 },
        evidence: { CREDIT: 15 },
    });
    assertEquals(result.output, { howLikelyToBeDetected: 100 });
});

Deno.test("stealthgpt#api/stealthify/detect estimate: one word per input word", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: { text: TEXT } }), {
        credits: { default: 15 },
        evidence: { CREDIT: 15 },
    });
    assertEquals(
        (await estimateEndpoint(unit, { body: { text: "   " } })).evidence,
        { CREDIT: 0 },
    );
});

Deno.test("stealthgpt#api/stealthify/detect: vendor refusals are zero-billed data", async () => {
    for (
        const [fixture, status] of [
            ["provider-error.json", 401],
            ["synthetic-payment-required.json", 402],
            ["word-limit.json", 400],
        ] as const
    ) {
        const result = await run(fixture, { text: TEXT });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            typeof (result.output as Record<string, unknown>).message,
            "string",
        );
    }
});

Deno.test("stealthgpt#api/stealthify/detect: the gate rejects an empty text or an unknown field, and passes a plain one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}detect.json`);
    const reject = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await reject({ text: "" });
    await reject({ prompt: TEXT });
    await reject({ text: TEXT, model: "super" });
    await assertInputAccepted({
        unit,
        input: { body: { text: TEXT } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "stealthgpt#api/stealthify/detect live: a short text answers with a score",
    ignore: liveSkip("stealthgpt"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { text: TEXT } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { default: 15 },
            evidence: { CREDIT: 15 },
        });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.howLikelyToBeDetected, "number");
        assert(!("wordsSpent" in output));
    },
});
