import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine, EngineError } from "@monid/connector-engine";
import type { Json, RunInput } from "@shared/core";
import {
    estimateEndpoint,
    type Fixture,
    liveSkip,
    loadEndpoint,
    loadFixture,
    replayFetch,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("./fixtures/", import.meta.url));
// Rates: https://api.prerenderbuddy.com/v1/developer/marketplace/rate-card (2026-10-02)
const RATES = {
    chatgpt: 0.025,
    claude: 0.024,
    gemini: 0.035,
    perplexity: 0.0058,
};
const input: RunInput = {
    body: {
        prompt:
            "What is prerendering for JavaScript websites? Give one concise paragraph with sources.",
        brand: { name: "Prerender Buddy", domain: "prerenderbuddy.com" },
    },
};
const jobId = "00000000-0000-4000-8000-000000000001";
const queued = {
    jobId,
    platform: "chatgpt",
    status: "queued",
    pollAfterSeconds: 5,
    billing: { currency: "USD", reservedUsd: 0.025, chargedUsd: 0 },
};
const completed = {
    ...queued,
    status: "completed",
    billing: { currency: "USD", reservedUsd: 0, chargedUsd: 0.025 },
    result: {
        answer: "A synthetic answer for lifecycle edge cases only.",
        citations: [],
        sources: [],
    },
};

function synthetic(status: number, body: Json, poll = false): Fixture {
    return {
        name: "synthetic-job-edge-case",
        description:
            "Synthetic fault injection; not a provider answer or customer result.",
        calls: [
            ...(poll
                ? [{
                    req: { method: "POST", url: "{{request.url}}" },
                    res: { status: 202, body: queued },
                }]
                : []),
            {
                req: {
                    method: poll ? "GET" : "POST",
                    url: poll
                        ? `{{request.origin}}/v1/developer/marketplace/jobs/${jobId}`
                        : "{{request.url}}",
                },
                res: { status, body },
            },
        ],
    };
}

Deno.test("PB: only answer endpoints carry the interned async lifecycle", async () => {
    const bundle = await testBundle();
    const first = bundle.endpoints["prerenderbuddy#answers/chatgpt"];
    assert(first.lifecycle?.start && first.lifecycle.poll);
    for (const platform of Object.keys(RATES)) {
        const doc = bundle.endpoints[`prerenderbuddy#answers/${platform}`];
        assertEquals(doc.lifecycle, first.lifecycle);
        assertEquals(doc.timeouts.runMs, 86_400_000);
        assertEquals(doc.request.method, "POST");
        assert(doc.request.url.endsWith(`/answers/${platform}`));
        // No stop hook: PB does not advertise a cancellation API.
        assertEquals(doc.lifecycle?.stop, undefined);
    }
    for (const id of ["prerenderbuddy#account", "prerenderbuddy#jobs/{id}"]) {
        assertEquals(bundle.endpoints[id].lifecycle, undefined);
    }
    assertEquals(
        bundle.endpoints["prerenderbuddy#answers/claude"].timeouts.pollMs,
        60_000,
    );
});

for (const [platform, price] of Object.entries(RATES)) {
    Deno.test(`PB ${platform}: live-recorded answer settles one USD debit including citations`, async () => {
        const unit = await testSealedUnit(`prerenderbuddy#answers/${platform}`);
        const estimate = await estimateEndpoint(unit, input);
        assertEquals(estimate, {
            credits: { default: price },
            evidence: { CALL: 1 },
        });
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: await loadFixture(`${chains}${platform}-completed.json`),
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, estimate);
        const output = result.output as Record<string, Json>;
        assertEquals(output.platform, platform);
        assertEquals(output.status, "completed");
        const answer = output.result as Record<string, Json>;
        assert(typeof answer.answer === "string" && answer.answer.length > 0);
        assert(Array.isArray(answer.citations));
        assert(Array.isArray(answer.sources));
        assert("brand" in answer && "methodology" in answer);
    });
}

Deno.test("PB free status read: a prior positive charge cannot bill again", async () => {
    const fixture = await loadFixture(`${chains}job-status-completed.json`);
    const body = fixture.calls[0].res.body as Record<string, Json>;
    const id = body.jobId;
    assert(typeof id === "string");
    const unit = await testSealedUnit("prerenderbuddy#jobs/{id}");
    assertEquals(await estimateEndpoint(unit, { pathParams: { id } }), {
        credits: {},
        evidence: {},
    });
    for (let i = 0; i < 2; i++) {
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            (result.output as Record<string, Json>).billing,
            body.billing,
        );
    }
});

Deno.test("PB free balance read is synchronous and cannot bill", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("prerenderbuddy#account"),
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${chains}account.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("PB start retries: same host run sends the same idempotency key and unchanged prompt", async () => {
    const unit = await testSealedUnit("prerenderbuddy#answers/chatgpt");
    const fixture = synthetic(202, queued);
    fixture.calls.push(structuredClone(fixture.calls[0]));
    const replay = replayFetch(fixture, {
        "request.url": unit.doc.request.url,
    });
    const keys: string[] = [];
    const bodies: Json[] = [];
    const endpoint = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                const headers = new Headers(init?.headers);
                keys.push(headers.get("Idempotency-Key")!);
                assertEquals(headers.get("Authorization"), "Bearer test-key");
                bodies.push(JSON.parse(String(init?.body)));
                return replay(url, init);
            },
        }),
    }).load(unit);
    const run = { runId: "host-stable-run" };
    const first = await endpoint.start(input, run);
    const retry = await endpoint.start(input, run);
    assertEquals(keys, ["host-stable-run:answer", "host-stable-run:answer"]);
    assertEquals(bodies, [input.body, input.body]);
    assert(first.kind === "RUNNING" && retry.kind === "RUNNING");
    assertEquals(first.state.externalRunId, retry.state.externalRunId);
});

Deno.test("PB poll retries retain the job after 429/5xx and settle only at completion", async () => {
    const unit = await testSealedUnit("prerenderbuddy#answers/chatgpt");
    const fixture = synthetic(429, {
        error: { code: "rate_limited", message: "Try later" },
    }, true);
    const readUrl = `{{request.origin}}/v1/developer/marketplace/jobs/${jobId}`;
    fixture.calls.push({
        req: { method: "GET", url: readUrl },
        res: { status: 503, body: { error: { message: "Unavailable" } } },
    });
    fixture.calls.push({
        req: { method: "GET", url: readUrl },
        res: { status: 200, body: completed },
    });
    const endpoint = await loadEndpoint({
        unit,
        input,
        mode: "replay",
        fixture,
    });
    const start = await endpoint.start(input);
    assert(start.kind === "RUNNING");
    const retry = await endpoint.poll(input, start.state);
    assert(retry.kind === "RUNNING");
    assertEquals(retry.pollAfterMs, 60_000);
    assertEquals(retry.state.externalRunId, jobId);
    const unavailable = await endpoint.poll(input, retry.state);
    assert(unavailable.kind === "RUNNING");
    assertEquals(unavailable.state.externalRunId, jobId);
    const result = await endpoint.poll(input, unavailable.state);
    assert(result.kind === "COMPLETED");
    assertEquals(result.usage.credits, { default: 0.025 });
});

Deno.test("PB idempotent terminal replay completes without polling", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("prerenderbuddy#answers/chatgpt"),
        input,
        mode: "replay",
        fixture: synthetic(200, { ...completed, replayed: true }),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.025 });
});

for (const status of [400, 401, 402, 403, 409, 429, 503]) {
    Deno.test(`PB submit HTTP ${status}: no usage`, async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("prerenderbuddy#answers/chatgpt"),
            input,
            mode: "replay",
            fixture: synthetic(status, {
                error: {
                    code: "test_error",
                    message: "Synthetic API rejection",
                },
            }),
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            (result.output as Record<string, Json>).message,
            "Synthetic API rejection",
        );
    });
}

for (
    const [name, body] of Object.entries({
        failed: {
            ...queued,
            status: "failed",
            error: {
                code: "provider_failed",
                message: "No completed answer was recorded.",
            },
        },
        empty: { ...completed, result: { answer: "   " } },
        missingReceipt: { ...completed, billing: {} },
        zeroReceipt: { ...completed, billing: { chargedUsd: 0 } },
        mismatchedJob: {
            ...completed,
            jobId: "00000000-0000-4000-8000-000000000002",
        },
        mismatchedPlatform: { ...completed, platform: "gemini" },
        unknownStatus: { ...completed, status: "surprise" },
        wrongCurrency: {
            ...completed,
            billing: { currency: "EUR", chargedUsd: 0.025 },
        },
    } as Record<string, Json>)
) {
    Deno.test(`PB ${name} terminal: cannot bill a bad answer`, async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("prerenderbuddy#answers/chatgpt"),
            input,
            mode: "replay",
            fixture: synthetic(200, body, true),
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}

for (
    const body of [
        { prompt: "tiny" },
        { prompt: "     " },
        { prompt: "x".repeat(1001) },
        { prompt: "A valid prompt", model: "custom-model" },
        {
            prompt: "A valid prompt",
            brand: { name: "", domain: "brand.example" },
        },
        {
            prompt: "A valid prompt",
            brand: { name: "Brand", domain: "https://brand.example/path" },
        },
        {
            prompt: "A valid prompt",
            competitors: Array.from({ length: 11 }, () => ({ name: "Brand" })),
        },
        {
            prompt: "A valid prompt",
            brand: {
                name: "Brand",
                aliases: Array.from({ length: 6 }, () => "Alias"),
            },
        },
    ] as Json[]
) {
    Deno.test(`PB input gate rejects unsupported/bounded input ${JSON.stringify(body).slice(0, 70)}`, async () => {
        const unit = await testSealedUnit("prerenderbuddy#answers/chatgpt");
        const error = await assertRejects(
            () => estimateEndpoint(unit, { body }),
            EngineError,
        );
        assertEquals(error.code, "INVALID_INPUT");
    });
}

Deno.test("PB valid minimal and maximum inputs estimate without network", async () => {
    const unit = await testSealedUnit("prerenderbuddy#answers/chatgpt");
    for (
        const body of [
            { prompt: "A valid question" },
            {
                prompt: "x".repeat(1000),
                brand: {
                    name: "Brand",
                    domain: "BRAND.EXAMPLE",
                    aliases: ["Alias"],
                },
                competitors: Array.from(
                    { length: 10 },
                    () => ({ name: "Other brand" }),
                ),
            },
        ] as Json[]
    ) {
        assertEquals((await estimateEndpoint(unit, { body })).credits, {
            default: 0.025,
        });
    }
});

for (const status of [404, 410]) {
    Deno.test(`PB status HTTP ${status} ends without charging`, async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("prerenderbuddy#answers/chatgpt"),
            input,
            mode: "replay",
            fixture: synthetic(status, {
                error: { code: "job_missing", message: "Job unavailable" },
            }, true),
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}

Deno.test("PB submit missing job id is a non-billable protocol error", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("prerenderbuddy#answers/chatgpt"),
        input,
        mode: "replay",
        fixture: synthetic(202, { status: "queued", platform: "chatgpt" }),
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "PB live published rate card matches compiled estimates",
    ignore: liveSkip("prerenderbuddy"),
    fn: async () => {
        const response = await fetch(
            "https://api.prerenderbuddy.com/v1/developer/marketplace/rate-card",
        );
        assertEquals(response.status, 200);
        const card = await response.json();
        assertEquals(card.currency, "USD");
        assertEquals(card.subscriptionRequired, false);
        assertEquals(card.errorsCharged, false);
        for (const [platform, price] of Object.entries(RATES)) {
            assertEquals(
                card.platforms.find((row: { platform: string }) =>
                    row.platform === platform
                ).priceUsd,
                price,
            );
        }
    },
});
