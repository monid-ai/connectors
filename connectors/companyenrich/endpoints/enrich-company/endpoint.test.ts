import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const id = "companyenrich#companies/enrich";
const baseInput: RunInput = { queryParams: { domain: "example.com" } };

Deno.test(`${id}: native request, bearer auth and unchanged response`, async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company.json`,
    );
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request, init) => {
                calls++;
                const expected = new URL(
                    "https://api.companyenrich.com/companies/enrich",
                );
                expected.searchParams.set("domain", "example.com");
                assertEquals(String(request), expected.href);
                assertEquals(init?.method, "GET");
                assertEquals(
                    new Headers(init?.headers).get("authorization"),
                    "Bearer test-key",
                );
                assertEquals(init?.body, undefined);
                return Promise.resolve(
                    new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const original = structuredClone(baseInput);
    const result = await (await engine.load(unit)).run(baseInput);
    assertEquals(calls, 1);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { call: 1, workforce: 0 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(baseInput, original);
    assertEquals(unit.doc.usage.consolidate, undefined);
});

Deno.test(`${id}: estimate and settlement bill a repeated expansion once`, async () => {
    const unit = await testSealedUnit(id);
    const baseEstimate = await estimateEndpoint(unit, baseInput);
    assertEquals(baseEstimate, {
        credits: { default: 1 },
        evidence: { call: 1, workforce: 0 },
    });
    const input = {
        ...baseInput,
        queryParams: {
            ...baseInput.queryParams,
            expand: ["workforce", "workforce"],
        },
    };
    const estimated = await estimateEndpoint(unit, input);
    assertEquals(estimated, {
        credits: { default: 6 },
        evidence: { call: 1, workforce: 1 },
    });
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company.json`,
    );
    const separator = fixture.calls[0].req.url.includes("?") ? "&" : "?";
    fixture.calls[0].req.url += `${separator}expand=workforce&expand=workforce`;
    const result = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { call: 1, workforce: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${id}: unsupported expansion fails before the wire`, async () => {
    const unit = await testSealedUnit(id);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                mode: "replay",
                input: {
                    ...baseInput,
                    queryParams: {
                        ...baseInput.queryParams,
                        expand: ["unsupported"],
                    },
                },
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        await estimateEndpoint(unit, {
            ...baseInput,
            queryParams: { ...baseInput.queryParams, expand: ["workforce"] },
        }),
        {
            credits: { default: 6 },
            evidence: { call: 1, workforce: 1 },
        },
    );
});

Deno.test(`${id}: provider errors remain data and settle at zero`, async () => {
    const unit = await testSealedUnit(id);
    for (const status of [401, 402, 404, 429]) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        );
        fixture.calls[0].req.method = "GET";
        fixture.calls[0].req.url += "?domain=example.com";
        fixture.calls[0].res.status = status;
        fixture.calls[0].res.body = {
            type: "about:blank",
            title: "Provider error",
            status,
        };
        const result = await runEndpoint({
            unit,
            input: baseInput,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("companyenrich: background enrichment 404 is zero-credit data", async () => {
    const unit = await testSealedUnit("companyenrich#companies/enrich");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-background-enrichment.json`,
    );
    const result = await runEndpoint({
        unit,
        mode: "replay",
        fixture,
        input: {
            queryParams: { domain: "example.com", waitForEnrichment: false },
        },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${id}: required identifier has a passing near-twin`, async () => {
    const unit = await testSealedUnit(id);
    await assertRejects(
        () => runEndpoint({ unit, mode: "replay", input: {} }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(await estimateEndpoint(unit, baseInput), {
        credits: { default: 1 },
        evidence: { call: 1, workforce: 0 },
    });
});

// Optional smoke check: at most one result, with expansions disabled.
// Synthetic replay fixtures do not claim live vendor verification.
Deno.test({
    name: `${id} live (gated on CompanyEnrich credentials)`,
    ignore: liveSkip("companyenrich"),
    fn: async () => {
        const unit = await testSealedUnit(id);
        const input: RunInput = {
            queryParams: { domain: "companyenrich.com" },
        };
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(typeof result.output, "object");
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
