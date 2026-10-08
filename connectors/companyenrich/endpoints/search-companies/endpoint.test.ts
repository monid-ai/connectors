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

const id = "companyenrich#companies/search";
const baseInput: RunInput = {
    body: { page: 1, pageSize: 10, semanticQuery: "B2B software" },
};

Deno.test(`${id}: native request, bearer auth and unchanged response`, async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company-page.json`,
    );
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (request, init) => {
                calls++;
                const expected = new URL(
                    "https://api.companyenrich.com/companies/search",
                );
                assertEquals(String(request), expected.href);
                assertEquals(init?.method, "POST");
                assertEquals(
                    new Headers(init?.headers).get("authorization"),
                    "Bearer test-key",
                );
                assertEquals(
                    JSON.parse(String(init?.body)),
                    baseInput.body,
                );
                assertEquals(
                    new Headers(init?.headers).get("content-type"),
                    "application/json",
                );
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
        credits: { default: 2 },
        evidence: { result: 2, workforce: 0 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(baseInput, original);
    assertEquals(unit.doc.usage.consolidate, undefined);
});

Deno.test(`${id}: estimate caps results, expansion bills delivered records once`, async () => {
    const unit = await testSealedUnit(id);
    const baseEstimate = await estimateEndpoint(unit, baseInput);
    assertEquals(baseEstimate, {
        credits: { default: 10 },
        evidence: { result: 10, workforce: 0 },
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
        credits: { default: 60 },
        evidence: { result: 10, workforce: 10 },
    });
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company-page.json`,
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
        credits: { default: 12 },
        evidence: { result: 2, workforce: 2 },
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
            credits: { default: 60 },
            evidence: { result: 10, workforce: 10 },
        },
    );
});

Deno.test(`${id}: provider errors remain data and settle at zero`, async () => {
    const unit = await testSealedUnit(id);
    for (const status of [401, 402, 404, 429]) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        );
        fixture.calls[0].req.method = "POST";
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

Deno.test(`${id}: empty page pays only the base minimum`, async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-empty-page.json`,
    );
    fixture.calls[0].req.url += "?expand=workforce";
    const result = await runEndpoint({
        unit,
        mode: "replay",
        fixture,
        input: {
            ...baseInput,
            queryParams: { expand: ["workforce"] },
        },
    });
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { result: 1, workforce: 0 },
    });
});

Deno.test(`${id}: pageSize is mandatory and bounded before the wire`, async () => {
    const unit = await testSealedUnit(id);
    for (const pageSize of [1, 100]) {
        assertEquals(
            await estimateEndpoint(unit, {
                body: {
                    ...baseInput.body as Record<string, unknown>,
                    pageSize,
                },
            }),
            {
                credits: { default: pageSize },
                evidence: { result: pageSize, workforce: 0 },
            },
        );
    }
    for (const pageSize of [undefined, 0, 101, 1.5]) {
        const body = {
            ...(baseInput.body as Record<string, unknown>),
        };
        if (pageSize === undefined) delete body.pageSize;
        else body.pageSize = pageSize;
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    mode: "replay",
                    input: { body: body as RunInput["body"] },
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

// Optional smoke check: at most one result, with expansions disabled.
// Synthetic replay fixtures do not claim live vendor verification.
Deno.test({
    name: `${id} live (gated on CompanyEnrich credentials)`,
    ignore: liveSkip("companyenrich"),
    fn: async () => {
        const unit = await testSealedUnit(id);
        const input: RunInput = {
            body: { page: 1, pageSize: 1, query: "CompanyEnrich" },
        };
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(typeof result.output, "object");
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
