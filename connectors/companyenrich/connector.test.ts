import { assert, assertEquals, assertRejects } from "@std/assert";
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

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const cases: {
    path: string;
    method: string;
    fixture: string;
    input: RunInput;
    expansion: string;
    base: number;
    expanded: number;
    estimate: number;
    expandedEstimate: number;
    search: boolean;
}[] = [
    {
        path: "/companies/enrich",
        method: "GET",
        fixture: "company",
        input: { queryParams: { domain: "example.com" } },
        expansion: "workforce",
        base: 1,
        expanded: 6,
        estimate: 1,
        expandedEstimate: 6,
        search: false,
    },
    {
        path: "/companies/search",
        method: "POST",
        fixture: "company-page",
        input: {
            body: { page: 1, pageSize: 10, semanticQuery: "B2B software" },
        },
        expansion: "workforce",
        base: 2,
        expanded: 12,
        estimate: 10,
        expandedEstimate: 60,
        search: true,
    },
    {
        path: "/companies/similar",
        method: "POST",
        fixture: "company-page",
        input: { body: { page: 1, pageSize: 10, domains: ["example.com"] } },
        expansion: "workforce",
        base: 10,
        expanded: 20,
        estimate: 50,
        expandedEstimate: 100,
        search: true,
    },
    {
        path: "/people/search",
        method: "POST",
        fixture: "person-page",
        input: { body: { page: 1, pageSize: 10, positionQuery: ["engineer"] } },
        expansion: "education",
        base: 4,
        expanded: 6,
        estimate: 20,
        expandedEstimate: 30,
        search: true,
    },
    {
        path: "/people/lookup",
        method: "POST",
        fixture: "person",
        input: { body: { email: "person@example.com" } },
        expansion: "education",
        base: 5,
        expanded: 6,
        estimate: 5,
        expandedEstimate: 6,
        search: false,
    },
];

for (const example of cases) {
    const id = `companyenrich#${example.path.slice(1)}`;

    Deno.test(`${id}: native request, bearer auth and unchanged response`, async () => {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${example.fixture}.json`,
        );
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (request, init) => {
                    calls++;
                    const expected = new URL(
                        `https://api.companyenrich.com${example.path}`,
                    );
                    if (example.method === "GET") {
                        expected.searchParams.set("domain", "example.com");
                    }
                    assertEquals(String(request), expected.href);
                    assertEquals(init?.method, example.method);
                    assertEquals(
                        new Headers(init?.headers).get("authorization"),
                        "Bearer test-key",
                    );
                    if (example.input.body !== undefined) {
                        assertEquals(
                            JSON.parse(String(init?.body)),
                            example.input.body,
                        );
                        assertEquals(
                            new Headers(init?.headers).get("content-type"),
                            "application/json",
                        );
                    }
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
        const original = structuredClone(example.input);
        const result = await (await engine.load(unit)).run(example.input);
        assertEquals(calls, 1);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage.credits, { default: example.base });
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(example.input, original);
        assertEquals(unit.doc.usage.consolidate, undefined);
    });

    Deno.test(`${id}: estimate caps results, expansion bills delivered records once`, async () => {
        const unit = await testSealedUnit(id);
        const baseEstimate = await estimateEndpoint(unit, example.input);
        assertEquals(baseEstimate.credits, { default: example.estimate });
        const input = {
            ...example.input,
            queryParams: {
                ...example.input.queryParams,
                expand: [example.expansion, example.expansion],
            },
        };
        const estimated = await estimateEndpoint(unit, input);
        assertEquals(estimated.credits, { default: example.expandedEstimate });
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${example.fixture}.json`,
        );
        const separator = fixture.calls[0].req.url.includes("?") ? "&" : "?";
        fixture.calls[0].req.url +=
            `${separator}expand=${example.expansion}&expand=${example.expansion}`;
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage.credits, { default: example.expanded });
        assertEquals(
            result.usage.evidence[example.expansion],
            example.search ? 2 : 1,
        );
        assertEquals(
            result.usage.evidence[example.search ? "result" : "call"],
            example.search ? 2 : 1,
        );
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
                        ...example.input,
                        queryParams: {
                            ...example.input.queryParams,
                            expand: ["unsupported"],
                        },
                    },
                }),
            Error,
            "INVALID_INPUT",
        );
    });

    Deno.test(`${id}: provider errors remain data and settle at zero`, async () => {
        const unit = await testSealedUnit(id);
        for (const status of [401, 402, 404, 429]) {
            const fixture = await loadFixture(
                `${fixturesDir}synthetic-provider-error.json`,
            );
            fixture.calls[0].req.method = example.method;
            if (example.method === "GET") {
                fixture.calls[0].req.url += "?domain=example.com";
            }
            fixture.calls[0].res.status = status;
            fixture.calls[0].res.body = {
                type: "about:blank",
                title: "Provider error",
                status,
            };
            const result = await runEndpoint({
                unit,
                input: example.input,
                mode: "replay",
                fixture,
            });
            assertEquals(result.httpStatus, status);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            assertEquals(result.output, fixture.calls[0].res.body);
        }
    });

    if (example.search) {
        Deno.test(`${id}: empty page pays only the base minimum`, async () => {
            const unit = await testSealedUnit(id);
            const fixture = await loadFixture(
                `${fixturesDir}synthetic-empty-page.json`,
            );
            fixture.calls[0].req.url += `?expand=${example.expansion}`;
            const result = await runEndpoint({
                unit,
                mode: "replay",
                fixture,
                input: {
                    ...example.input,
                    queryParams: { expand: [example.expansion] },
                },
            });
            assertEquals(result.usage.credits, { default: example.base / 2 });
            assertEquals(result.usage.evidence, {
                result: 1,
                [example.expansion]: 0,
            });
        });

        Deno.test(`${id}: pageSize is mandatory and bounded before the wire`, async () => {
            const unit = await testSealedUnit(id);
            for (const pageSize of [undefined, 0, 101, 1.5]) {
                const body = {
                    ...(example.input.body as Record<string, unknown>),
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
    }
}

Deno.test({
    name: "companyenrich#people/lookup live (gated; reserved example address)",
    ignore: liveSkip("companyenrich"),
    fn: async () => {
        const unit = await testSealedUnit("companyenrich#people/lookup");
        const result = await runEndpoint({
            unit,
            input: { body: { email: "person@example.com" } },
            mode: "live",
        });
        assert([200, 404].includes(result.httpStatus));
        assertEquals(
            result.usage.credits,
            result.httpStatus === 200 ? { default: 5 } : {},
        );
    },
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

Deno.test("companyenrich: required identifiers and seed bounds validate before the wire", async () => {
    const enrich = await testSealedUnit("companyenrich#companies/enrich");
    await assertRejects(
        () => runEndpoint({ unit: enrich, mode: "replay", input: {} }),
        Error,
        "INVALID_INPUT",
    );
    const lookup = await testSealedUnit("companyenrich#people/lookup");
    await assertRejects(
        () =>
            runEndpoint({ unit: lookup, mode: "replay", input: { body: {} } }),
        Error,
        "INVALID_INPUT",
    );
    const similar = await testSealedUnit("companyenrich#companies/similar");
    for (const domains of [[], Array(11).fill("example.com")]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit: similar,
                    mode: "replay",
                    input: { body: { pageSize: 1, domains } },
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test("companyenrich: rich filters preserve native arrays, nulls and nested structures", async () => {
    const input = {
        body: {
            page: 1,
            pageSize: 2,
            query: null,
            positionQuery: ["CEO", "Founder"],
            atCurrentCompanyAfter: "2026-01-01T00:00:00Z",
            domains: ["example.com"],
            companyFilter: {
                search: {
                    semanticQuery: "software companies",
                    countries: ["US"],
                    technologies: ["React"],
                },
            },
            education: { institutionNameQuery: ["Example University"] },
        },
    };
    const unit = await testSealedUnit("companyenrich#people/search");
    let sent = false;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_request, init) => {
                sent = true;
                assertEquals(JSON.parse(String(init?.body)), input.body);
                return Promise.resolve(
                    new Response(JSON.stringify({ items: [] }), {
                        status: 200,
                    }),
                );
            },
        }),
    });
    await (await engine.load(unit)).run(input);
    assert(sent);
});

// Optional smoke checks use at most one result, with expansions disabled.
// They are not fixtures or claims of a recorded live verification.
for (const example of cases.filter((item) => item.path !== "/people/lookup")) {
    const id = `companyenrich#${example.path.slice(1)}`;
    Deno.test({
        name: `${id} live (gated on CompanyEnrich credentials)`,
        ignore: liveSkip("companyenrich"),
        fn: async () => {
            const unit = await testSealedUnit(id);
            const input: RunInput = example.path === "/companies/enrich"
                ? { queryParams: { domain: "companyenrich.com" } }
                : example.path === "/companies/similar"
                ? {
                    body: {
                        page: 1,
                        pageSize: 1,
                        domains: ["companyenrich.com"],
                    },
                }
                : example.path === "/companies/search"
                ? { body: { page: 1, pageSize: 1, query: "CompanyEnrich" } }
                : {
                    body: {
                        page: 1,
                        pageSize: 1,
                        domains: ["companyenrich.com"],
                    },
                };
            const result = await runEndpoint({ unit, input, mode: "live" });
            assertEquals(result.isProviderError, false);
            assertEquals(result.httpStatus, 200);
            assertEquals(typeof result.usage.credits.default, "number");
        },
    });
}
