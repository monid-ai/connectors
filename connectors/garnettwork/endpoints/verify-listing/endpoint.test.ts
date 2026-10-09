import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    directTransport,
    Engine,
    EngineError,
    EngineErrorCode,
} from "@monid/connector-engine";
import {
    type Fixture,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const endpointId = "garnettwork#verify-listing";
const listingInput = {
    url: "https://www.ebay.com/itm/000000000000",
    intent: "BUY",
};
const failFixturePath = fromFileUrl(
    new URL(
        "../../fixtures/synthetic-rest-ps5-fail.json",
        import.meta.url,
    ),
);
const refuseFixturePath = fromFileUrl(
    new URL(
        "../../fixtures/synthetic-rest-ps5-refuse.json",
        import.meta.url,
    ),
);

function syntheticFixture(status: number, body: Json): Fixture {
    return {
        name: `synthetic-protocol-${status}`,
        description:
            "Synthetic protocol test only; not a recorded GarnettWork response or live endpoint proof.",
        calls: [{
            req: {
                method: "POST",
                url: "https://mcp.garnettwork.com/monid/verify",
                body: listingInput,
            },
            res: { status, body },
        }],
    };
}

Deno.test("garnettwork: synthetic FAIL fixture preserves native body", async () => {
    const fixture = await loadFixture(failFixturePath);
    const result = await runEndpoint({
        unit: await testSealedUnit(endpointId),
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(fixture.description.includes("Synthetic contract fixture"));
});

Deno.test("garnettwork: synthetic REFUSE fixture preserves native body", async () => {
    const fixture = await loadFixture(refuseFixturePath);
    const result = await runEndpoint({
        unit: await testSealedUnit(endpointId),
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (result.output as Record<string, Json>).decision,
        { verdict: "REFUSE", reason: "SYNTHETIC_INSUFFICIENT_EVIDENCE" },
    );
});

Deno.test("garnettwork: synthetic unknowns and receipt unavailability stay visible", async () => {
    const fixture = await loadFixture(refuseFixturePath);
    const result = await runEndpoint({
        unit: await testSealedUnit(endpointId),
        input: { body: listingInput },
        mode: "replay",
        fixture,
    });
    const body = result.output as Record<string, Json>;
    assertEquals(
        (body.market as Record<string, Json>).max_safe_buy,
        null,
    );
    assertEquals(
        (body.shipping_evidence as Record<string, Json>).resolved,
        false,
    );
    assertEquals(
        (body.receipt as Record<string, Json>).receipt_status,
        "UNAVAILABLE",
    );
});

for (const verdict of ["PASS", "FAIL", "REFUSE"]) {
    Deno.test(`garnettwork: synthetic ${verdict} remains application data without inferred price or receipt`, async () => {
        const body = {
            schema_version: "garnett-deal-or-disaster-v1",
            decision: { verdict, reason: "SYNTHETIC_PROTOCOL_TEST_ONLY" },
            market: { max_safe_buy: null },
            receipt: null,
        };
        const result = await runEndpoint({
            unit: await testSealedUnit(endpointId),
            input: { body: listingInput },
            mode: "replay",
            fixture: syntheticFixture(200, body),
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.output, body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}

Deno.test("garnettwork: synthetic present receipt metadata stays native", async () => {
    const body = {
        schema_version: "garnett-deal-or-disaster-v1",
        decision: { verdict: "PASS", reason: "SYNTHETIC_PROTOCOL_TEST_ONLY" },
        receipt: {
            receipt_status: "AVAILABLE",
            receipt_id: "synthetic-receipt-id",
            evidence_hash: "synthetic-evidence-hash",
        },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(endpointId),
        input: { body: listingInput },
        mode: "replay",
        fixture: syntheticFixture(200, body),
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("garnettwork: synthetic absent and null facts stay distinct", async () => {
    const cases: Json[] = [
        {
            schema_version: "garnett-deal-or-disaster-v1",
            decision: { verdict: "REFUSE" },
        },
        {
            schema_version: "garnett-deal-or-disaster-v1",
            decision: { verdict: "REFUSE" },
            market: { max_safe_buy: null },
            shipping_evidence: {
                resolved: false,
                amount: null,
                checkout_total_verified: false,
            },
            receipt: { receipt_status: "UNAVAILABLE" },
        },
    ];
    for (const body of cases) {
        const result = await runEndpoint({
            unit: await testSealedUnit(endpointId),
            input: { body: listingInput },
            mode: "replay",
            fixture: syntheticFixture(200, body),
        });
        assertEquals(result.output, body);
    }
});

for (const status of [400, 401, 404, 429, 500, 502, 503]) {
    Deno.test(`garnettwork: synthetic HTTP ${status} stays an operational error, never a market verdict`, async () => {
        const body = { error: "SYNTHETIC_OPERATIONAL_ERROR" };
        const result = await runEndpoint({
            unit: await testSealedUnit(endpointId),
            input: { body: listingInput },
            mode: "replay",
            fixture: syntheticFixture(status, body),
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(!("decision" in (result.output as Record<string, Json>)));
    });
}

Deno.test("garnettwork: synthetic body and bearer auth are forwarded exactly once", async () => {
    const fixture = await loadFixture(failFixturePath);
    const input = {
        ...listingInput,
        destination: { country: "US", postal_code: "00000" },
    };
    const observed: Array<{ url: string; init?: RequestInit }> = [];
    const engine = new Engine({
        transport: directTransport({
            params: (provider, fields) => {
                assertEquals(provider, "garnettwork");
                assertEquals(fields, ["apiKey"]);
                return Promise.resolve({ apiKey: "synthetic-test-key" });
            },
            fetch: (url, init) => {
                observed.push({ url: String(url), init });
                return Promise.resolve(
                    new Response(JSON.stringify(fixture.calls[0].res.body)),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(endpointId));
    const result = await loaded.run({ body: input });
    assertEquals(observed.length, 1);
    assertEquals(observed[0].url, "https://mcp.garnettwork.com/monid/verify");
    assertEquals(observed[0].init?.method, "POST");
    assertEquals(JSON.parse(String(observed[0].init?.body)), input);
    const headers = new Headers(observed[0].init?.headers);
    assertEquals(headers.get("authorization"), "Bearer synthetic-test-key");
    assertEquals(headers.get("content-type"), "application/json");
    assertEquals(observed[0].init?.redirect, "manual");
    assertEquals(result.output, fixture.calls[0].res.body);
    assert(!JSON.stringify(result.output).includes("synthetic-test-key"));
});

Deno.test("garnettwork: omitted destination is not manufactured", async () => {
    let sentBody: unknown;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "synthetic-test-key" }),
            fetch: (_url, init) => {
                sentBody = JSON.parse(String(init?.body));
                return Promise.resolve(
                    new Response(JSON.stringify({
                        schema_version: "garnett-deal-or-disaster-v1",
                        decision: { verdict: "REFUSE" },
                    })),
                );
            },
        }),
    }).load(await testSealedUnit(endpointId));
    await loaded.run({ body: listingInput });
    assertEquals(sentBody, listingInput);
});

Deno.test("garnettwork: invalid input fails before any upstream call", async () => {
    const unit = await testSealedUnit(endpointId);
    const invalid: Json[] = [
        { url: listingInput.url },
        { ...listingInput, intent: "SELL" },
        { ...listingInput, url: "not-a-url" },
        { ...listingInput, unexpected: true },
        {
            ...listingInput,
            destination: { country: "CA", postal_code: "00000" },
        },
        { ...listingInput, destination: { country: "US", postal_code: "123" } },
    ];
    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            EngineError,
            "INVALID_INPUT",
        );
    }
});

Deno.test("garnettwork: missing credentials fail before network", async () => {
    let calls = 0;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: () => {
                calls++;
                return Promise.reject(new Error("must not be reached"));
            },
        }),
    }).load(await testSealedUnit(endpointId));
    const error = await assertRejects(
        () => loaded.run({ body: listingInput }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.MISSING_CREDENTIAL);
    assertEquals(calls, 0);
});

Deno.test("garnettwork: transport failure stays execution error with no synthesized REFUSE", async () => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "synthetic-test-key" }),
            fetch: () =>
                Promise.reject(new Error("synthetic connection failure")),
        }),
    }).load(await testSealedUnit(endpointId));
    const error = await assertRejects(
        () => loaded.run({ body: listingInput }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
});

Deno.test("garnettwork: timeout and activation limits survive compilation", async () => {
    const unit = await testSealedUnit(endpointId);
    assertEquals(unit.doc.timeouts.requestMs, 30_000);
    assertEquals(unit.doc.timeouts.runMs, 30_000);
    assertEquals(
        unit.doc.request.url,
        "https://mcp.garnettwork.com/monid/verify",
    );
    assert(
        unit.doc.meta.notes?.some((note) =>
            note.includes("operational configuration outside this source")
        ),
    );
    assert(
        unit.doc.meta.notes?.some((note) => note.includes("FREE is a private")),
    );
});

Deno.test("garnettwork: invalid HTTP 200 bodies fail output validation, never become REFUSE", async () => {
    const invalid: Json[] = [
        "<html>Service unavailable</html>",
        null,
        {},
        { schema_version: "garnett-deal-or-disaster-v1" },
        {
            schema_version: "garnett-deal-or-disaster-v1",
            decision: { verdict: "SOLD" },
        },
        { schema_version: "unexpected-version", decision: { verdict: "PASS" } },
    ];
    const unit = await testSealedUnit(endpointId);
    for (const body of invalid) {
        const error = await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: listingInput },
                    mode: "replay",
                    fixture: syntheticFixture(200, body),
                }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.CONTRACT_VIOLATION);
    }
});


Deno.test({
    name: "garnettwork#verify-listing live (gated on GARNETTWORK_API_KEY)",
    ignore: liveSkip("garnettwork"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(endpointId),
            input: { body: listingInput },
            mode: "live",
        });
        assertEquals(result.isProviderError, false, JSON.stringify(result.output));
        const body = result.output as Record<string, Json>;
        assertEquals(body.schema_version, "garnett-deal-or-disaster-v1");
        const decision = body.decision as Record<string, Json>;
        assert(["PASS", "FAIL", "REFUSE"].includes(String(decision.verdict)));
    },
});
