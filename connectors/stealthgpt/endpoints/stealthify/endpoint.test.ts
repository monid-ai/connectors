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
const ID = "stealthgpt#api/stealthify";
const SOURCE =
    "Renewable energy offers several significant advantages in our modern world.";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("stealthgpt#api/stealthify: a `super` humanize settles the vendor's wordsSpent; meter and account fields stripped", async () => {
    const result = await run("stealthify-humanize.json", {
        prompt: SOURCE,
        rephrase: true,
        model: "super",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 60 },
        evidence: { CREDIT: 60 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.howLikelyToBeDetected, 93);
    assertEquals(typeof output.result, "string");
    for (
        const stripped of [
            "wordsSpent",
            "remainingCredits",
            "billingMode",
            "meteredChargedCredits",
            "tokensSpent",
            "totalTokensSpent",
            "systemTokensSpent",
        ]
    ) {
        assertEquals(stripped in output, false, stripped);
    }
});

Deno.test("stealthgpt#api/stealthify: a `standard` generation settles the same way", async () => {
    const result = await run("stealthify-generate.json", {
        prompt:
            "In about 60 words, explain two benefits of renewable energy for a small town.",
        rephrase: false,
        model: "standard",
        writingMode: "default",
        outputFormat: "markdown",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 85 },
        evidence: { CREDIT: 85 },
    });
    assertEquals(
        "billingMode" in (result.output as Record<string, unknown>),
        false,
    );
});

Deno.test("stealthgpt#api/stealthify estimate: input words, × 2.5 on `super`, × 1 otherwise", async () => {
    const unit = await testSealedUnit(ID);
    const estimate = (model: string) =>
        estimateEndpoint(unit, {
            body: { prompt: SOURCE, rephrase: true, model },
        });
    assertEquals(await estimate("super"), {
        credits: { default: 25 },
        evidence: { CREDIT: 25 },
    });
    for (const model of ["standard", "lite", "heavy"]) {
        assertEquals((await estimate(model)).evidence, { CREDIT: 10 }, model);
    }
    assertEquals(
        (await estimateEndpoint(unit, {
            body: { prompt: "one two three", rephrase: true, model: "super" },
        })).evidence,
        { CREDIT: 8 },
    );
});

Deno.test("stealthgpt#api/stealthify: vendor refusals are zero-billed data with a digestible message", async () => {
    const cases: [string, number, string][] = [
        ["provider-error.json", 401, "Unauthorized"],
        [
            "synthetic-payment-required.json",
            402,
            "Payment required or payment method not set up",
        ],
        ["word-limit.json", 400, "The text exceeds the 3,000 word limit"],
    ];
    for (const [fixture, status, message] of cases) {
        const result = await run(fixture, {
            prompt: SOURCE,
            rephrase: true,
            model: "standard",
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.message, message);
        assertEquals((output.raw as Record<string, unknown>).message, message);
    }
});

Deno.test("stealthgpt#api/stealthify: the compiled doc carries the vendor's defaults and requires `model`", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as {
        required?: string[];
        properties: Record<string, { default?: unknown }>;
        additionalProperties?: boolean;
    };
    assertEquals(
        new Set(body.required),
        new Set(["prompt", "rephrase", "model"]),
    );
    assertEquals(body.properties.writingMode.default, "essay");
    assertEquals(body.properties.qualityMode.default, "quality");
    assertEquals(body.properties.isMultilingual.default, true);
    assertEquals(body.properties.outputFormat.default, "text");
    assertEquals(body.additionalProperties, false);
    for (const hidden of ["business", "detector", "mode"]) {
        assert(!(hidden in body.properties), `${hidden} must not be exposed`);
    }
    assertEquals(
        unit.doc.request.url,
        "https://www.stealthgpt.ai/api/stealthify",
    );
});

Deno.test("stealthgpt#api/stealthify: the gate rejects a missing `model` or a removed field, and passes a full body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}stealthify-humanize.json`);
    const reject = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await reject({ prompt: SOURCE, rephrase: true });
    await reject({ prompt: SOURCE, rephrase: true, model: "turbo" });
    await reject({ prompt: SOURCE, rephrase: "true", model: "super" });
    await reject({
        prompt: SOURCE,
        rephrase: true,
        model: "super",
        business: true,
    });
    await reject({ prompt: "", rephrase: true, model: "super" });
    await assertInputAccepted({
        unit,
        input: {
            body: {
                prompt: "Explain the benefits of renewable energy",
                rephrase: false,
                model: "lite",
                tone: "PhD",
                writingMode: "essay",
                qualityMode: "fast",
                isMultilingual: false,
                outputFormat: "markdown",
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "stealthgpt#api/stealthify live: a short humanize answers with a rewrite and a score",
    ignore: liveSkip("stealthgpt"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    prompt: SOURCE,
                    rephrase: true,
                    model: "lite",
                    qualityMode: "fast",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(result.usage.evidence.CREDIT > 0);
        assertEquals(
            result.usage.credits.default,
            result.usage.evidence.CREDIT,
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.result, "string");
        assertEquals(typeof output.howLikelyToBeDetected, "number");
        assert(!("remainingCredits" in output));
    },
});
