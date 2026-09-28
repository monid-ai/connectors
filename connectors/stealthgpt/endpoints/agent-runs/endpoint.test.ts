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
const ID = "stealthgpt#api/stealthify/agent/runs";
const PROMPT =
    "A short LinkedIn post of about 100 words on why engineering teams should write down their async standups instead of holding meetings.";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("stealthgpt#api/stealthify/agent/runs: the poll follows statusUrl through running ticks and settles creditsSpent", async () => {
    const result = await run("agent-runs-completed.json", {
        preset: "social",
        platform: "linkedin",
        prompt: PROMPT,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1390 },
        evidence: { CREDIT: 1390 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.preset, "social");
    assertEquals(output.outputWords, 139);
    assertEquals(typeof output.result, "string");
    for (
        const stripped of [
            "creditsSpent",
            "remainingCredits",
            "billingMode",
            "meteredChargedCredits",
        ]
    ) {
        assertEquals(stripped in output, false, stripped);
    }
});

Deno.test("stealthgpt#api/stealthify/agent/runs: a failed run is ours/theirs and bills nothing", async () => {
    const result = await run("synthetic-agent-runs-failed.json", {
        preset: "seo",
        prompt: PROMPT,
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "generation_failed");
    assertEquals(output.message, "Stealth Agent generation failed");
});

Deno.test("stealthgpt#api/stealthify/agent/runs: a submit refusal is zero-billed data", async () => {
    for (
        const [fixture, status] of [
            ["provider-error.json", 401],
            ["synthetic-payment-required.json", 402],
        ] as const
    ) {
        const result = await run(fixture, {
            preset: "academic",
            prompt: PROMPT,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("stealthgpt#api/stealthify/agent/runs estimate: the line is present at zero", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { preset: "social", prompt: PROMPT, platform: "linkedin" },
        }),
        { credits: {}, evidence: { CREDIT: 0 } },
    );
    assert(unit.doc.timeouts.runMs >= 600_000);
});

Deno.test("stealthgpt#api/stealthify/agent/runs: the compiled body is one strict arm per preset, webhooks hidden", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as {
        anyOf?: Array<{
            required?: string[];
            properties: Record<string, unknown>;
            additionalProperties?: boolean;
        }>;
        oneOf?: Array<{
            required?: string[];
            properties: Record<string, unknown>;
            additionalProperties?: boolean;
        }>;
    };
    const arms = body.anyOf ?? body.oneOf;
    assert(arms !== undefined && arms.length === 3);
    for (const arm of arms) {
        assertEquals(arm.additionalProperties, false);
        assert(arm.required?.includes("preset"));
        assert(arm.required?.includes("prompt"));
        assert(!("webhookUrl" in arm.properties));
        assert(!("webhookSecret" in arm.properties));
    }
    const social = arms.find((arm) => "platform" in arm.properties);
    assert(social !== undefined);
    assert(social.required?.includes("platform"));
    assertEquals(
        unit.doc.request.url,
        "https://www.stealthgpt.ai/api/stealthify/agent/runs",
    );
});

Deno.test("stealthgpt#api/stealthify/agent/runs: the gate rejects an unknown preset, a social post without a platform, a platform on academic, and a webhook", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}agent-runs-completed.json`);
    const reject = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await reject({ preset: "essay", prompt: PROMPT });
    await reject({ preset: "social", prompt: PROMPT });
    await reject({ preset: "academic", prompt: PROMPT, platform: "linkedin" });
    await reject({ preset: "social", prompt: PROMPT, platform: "x" });
    await reject({
        preset: "seo",
        prompt: PROMPT,
        webhookUrl: "https://example.com/hook",
    });
    await reject({ preset: "academic", prompt: "" });
    await reject({ preset: "academic", prompt: PROMPT, tone: "PhD" });
    await assertInputAccepted({
        unit,
        input: {
            body: {
                preset: "academic",
                prompt: PROMPT,
                enableFactCheck: true,
                enableImageGeneration: false,
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "stealthgpt#api/stealthify/agent/runs live: a short social post completes with markdown",
    ignore: liveSkip("stealthgpt"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    preset: "social",
                    platform: "linkedin",
                    prompt: PROMPT,
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
        assertEquals(output.status, "completed");
        assertEquals(typeof output.result, "string");
        assertEquals(typeof output.outputWords, "number");
        assertEquals(
            result.usage.evidence.CREDIT,
            Math.ceil((output.outputWords as number) * 10),
        );
        assert(!("remainingCredits" in output));
    },
});
