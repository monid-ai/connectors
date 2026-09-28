import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "stealthgpt#api/stealthify/runs";
const SOURCE =
    "Renewable energy offers several significant advantages in our modern world.";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("stealthgpt#api/stealthify/runs: the poll follows statusUrl and settles the vendor's wordsSpent", async () => {
    const result = await run("runs-completed.json", {
        text: SOURCE,
        model: "lite",
        qualityMode: "fast",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 19 },
        evidence: { CREDIT: 19 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.howLikelyToBeDetected, 96);
    assertEquals(typeof output.result, "string");
    for (
        const stripped of [
            "wordsSpent",
            "creditsSpent",
            "remainingCredits",
            "billingMode",
            "meteredChargedCredits",
        ]
    ) {
        assertEquals(stripped in output, false, stripped);
    }
});

Deno.test("stealthgpt#api/stealthify/runs: without a statusUrl the poll reads the documented route with the id encoded", async () => {
    const result = await run("synthetic-runs-fallback-path.json", {
        text: SOURCE,
        model: "standard",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1000 },
        evidence: { CREDIT: 1000 },
    });
});

Deno.test("stealthgpt#api/stealthify/runs: a failed run is ours/theirs and bills nothing", async () => {
    const result = await run("synthetic-runs-failed.json", {
        text: SOURCE,
        model: "super",
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "humanize_failed");
    assertEquals(output.message, "Humanization failed");
});

Deno.test("stealthgpt#api/stealthify/runs: a cancelled run completes under 499 and bills nothing", async () => {
    const result = await run("synthetic-runs-cancelled.json", {
        text: SOURCE,
        model: "lite",
    });
    assertEquals(result.httpStatus, 499);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "cancelled",
    );
});

Deno.test("stealthgpt#api/stealthify/runs: a failed status lookup keeps the run alive, and Retry-After sets the next tick", async () => {
    const input = { body: { text: SOURCE, model: "super" } };
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-runs-transient.json`),
    });
    const started = await loaded.start(input);
    assert(started.kind === "RUNNING");
    assertEquals(started.state.externalRunId, "stealthify-api-run:slow01");
    const held = await loaded.poll(input, started.state);
    assert(held.kind === "RUNNING");
    assertEquals(held.pollAfterMs, 7_000);
    const settled = await loaded.poll(input, held.state);
    assert(settled.kind === "COMPLETED");
    assertEquals(settled.httpStatus, 200);
    assertEquals(settled.usage, {
        credits: { default: 500 },
        evidence: { CREDIT: 500 },
    });
});

Deno.test("stealthgpt#api/stealthify/runs: a submit refusal is zero-billed data", async () => {
    for (
        const [fixture, status] of [
            ["provider-error.json", 401],
            ["synthetic-payment-required.json", 402],
        ] as const
    ) {
        const result = await run(fixture, { text: SOURCE, model: "super" });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("stealthgpt#api/stealthify/runs estimate: input words, × 2.5 on `super`", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { text: SOURCE, model: "super" },
        }),
        { credits: { default: 25 }, evidence: { CREDIT: 25 } },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            body: { text: SOURCE, model: "heavy" },
        }))
            .evidence,
        { CREDIT: 10 },
    );
});

Deno.test("stealthgpt#api/stealthify/runs: the compiled doc requires `model` and hides the webhook fields", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as {
        required?: string[];
        properties: Record<string, { default?: unknown }>;
        additionalProperties?: boolean;
    };
    assertEquals(new Set(body.required), new Set(["text", "model"]));
    assertEquals(body.properties.qualityMode.default, "quality");
    assertEquals(body.properties.outputFormat.default, "text");
    assertEquals(body.additionalProperties, false);
    for (const hidden of ["webhookUrl", "webhookSecret", "file"]) {
        assert(!(hidden in body.properties), `${hidden} must not be exposed`);
    }
    assertEquals(
        unit.doc.request.url,
        "https://www.stealthgpt.ai/api/stealthify/runs",
    );
    const start = unit.doc.lifecycle?.start?.$fn.key;
    assert(start !== undefined);
    assert(unit.fns[start].src.includes("idempotency-key"));
});

Deno.test("stealthgpt#api/stealthify/runs: the gate rejects a missing `model`, a webhook, or a `prompt`, and passes a full body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}runs-completed.json`);
    const reject = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await reject({ text: SOURCE });
    await reject({ prompt: SOURCE, model: "super" });
    await reject({
        text: SOURCE,
        model: "super",
        webhookUrl: "https://example.com/hook",
    });
    await reject({ text: "", model: "super" });
    await assertInputAccepted({
        unit,
        input: {
            body: {
                text: SOURCE,
                model: "super",
                qualityMode: "fast",
                outputFormat: "markdown",
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "stealthgpt#api/stealthify/runs live: a short run completes with a rewrite",
    ignore: liveSkip("stealthgpt"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { text: SOURCE, model: "lite", qualityMode: "fast" },
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
        assert(!("remainingCredits" in output));
    },
});
