import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { RunKind, StopKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";

const ID = "supercool#v1/messages";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { message: "A product photo of a ceramic coffee mug" } };

const run = async (name: string) =>
    await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${name}.json`),
    });

Deno.test("supercool: processing work long-polls to completed and settles the receipt exactly", async () => {
    const result = await run("synthetic-work-completed");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // claim 12.5 credits = fold 1250 hundredths × 0.01
    assertEquals(result.usage, {
        credits: { default: 12.5 },
        evidence: { CREDIT: 1250 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.credits_used, undefined); // the receipt is plucked
    const files = output.files as Array<{ name: string }>;
    assertEquals(files[0].name, "mug.png");
});

Deno.test("supercool: a plain reply settles on the submit without polling, and bills nothing", async () => {
    const result = await run("synthetic-reply-on-submit");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, {});
    assertEquals(
        (result.output as { reply: string }).reply.startsWith("Yes"),
        true,
    );
});

Deno.test("supercool: an account out of credits is a 402 with zero usage", async () => {
    const result = await run("synthetic-out-of-credits");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.providerHttpStatus, 201);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("supercool: a rejected key is data, not a poll", async () => {
    const result = await run("synthetic-unauthorized");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("supercool: a failed status read holds the run instead of ending it", async () => {
    const result = await run("synthetic-status-read-retry");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 12.5 });
});

Deno.test("supercool: work that fails after starting is a 502 with zero usage", async () => {
    const result = await run("synthetic-work-failed");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("supercool: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ message: "" }, "empty message");
    await rejects({ message: "a".repeat(20_001) }, "message over 20,000");
    await rejects({ message: "hi", extra: true }, "unknown field");
    await rejects(
        { message: "hi", files: [{ url: "not a url" }] },
        "file without a URL",
    );
    await rejects(
        { message: "hi", files: [{ url: "http://example.com/a.png" }] },
        "file URL that isn't https",
    );
    await rejects(
        {
            message: "hi",
            files: Array.from({ length: 6 }, (_, i) => ({
                url: `https://example.com/${i}.png`,
            })),
        },
        "more than 5 files",
    );
});

Deno.test("supercool: work queued for credits is cancelled, then settles as a 402", async () => {
    // Cancelled first, so a later top-up can't run and bill it outside the run.
    const result = await run("synthetic-queued-for-credits");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const raw = (result.output as { raw: Record<string, unknown> }).raw;
    assertEquals([raw.status, raw.reason, raw.final], [
        "failed",
        "cancelled",
        true,
    ]);
});

Deno.test("supercool: held work after paid work settles the receipt the earlier work drew", async () => {
    const result = await run("synthetic-held-after-paid-work");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 3.5 },
        evidence: { CREDIT: 350 },
    });
});

Deno.test("supercool: held work a top-up started first is polled to its real end", async () => {
    const result = await run("synthetic-held-cancel-not-final");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 9.25 },
        evidence: { CREDIT: 925 },
    });
});

Deno.test("supercool: the schema gate passes five https files and the message unchanged", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            error: "unauthorized",
                            message: "stop here",
                        }),
                        {
                            status: 401,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const files = Array.from({ length: 5 }, (_, i) => ({
        url: `https://example.com/${i}.png`,
        name: `${i}.png`,
    }));
    const loaded = await engine.load(await testSealedUnit(ID));
    await loaded.run({ body: { message: "Use these product shots", files } });
    assertEquals(sent, [{ message: "Use these product shots", files }]);
});

Deno.test({
    name: "supercool: live reply settles a receipt (shape only)",
    ignore: liveSkip("supercool"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { message: "In one sentence, what can you make?" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as Record<string, unknown>;
        assert(typeof output.id === "string" && output.id !== "");
        assertEquals(output.final, true);
        assert(typeof output.reply === "string");
        assertEquals(output.credits_used, undefined); // plucked as the receipt
        assert(typeof result.usage.evidence.CREDIT === "number");
    },
});

const stopWith = async (name: string, runId: string) => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${name}.json`),
    });
    const run = { runId };
    const started = await loaded.start(INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    return await loaded.stop(INPUT, started.state, run);
};

Deno.test("supercool: stop cancels the message and settles the credits the work already drew", async () => {
    const stopped = await stopWith("synthetic-stop-settled", "test-stop-1");
    assert(stopped.kind === RunKind.COMPLETED, "stop settles");
    assertEquals(stopped.usage.credits, { default: 6.5 });
    assertEquals(stopped.usage.evidence, { CREDIT: 650 });
});

Deno.test("supercool: stop that can't see the work end is UNRESOLVED", async () => {
    const stopped = await stopWith("synthetic-stop-unresolved", "test-stop-2");
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
});
