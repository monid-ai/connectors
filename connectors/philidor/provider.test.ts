import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("./", import.meta.url));

const CASES: ReadonlyArray<{
    id: string;
    fixture: string;
    input: RunInput;
}> = [
    {
        id: "philidor#vaults",
        fixture: "endpoints/vaults/fixtures/happy.json",
        input: {
            queryParams: {
                limit: 1,
                sortBy: "tvl_usd",
                sortOrder: "desc",
            },
        },
    },
    {
        id: "philidor#vault/{network}/{address}",
        fixture: "endpoints/vault-detail/fixtures/happy.json",
        input: {
            pathParams: {
                network: "ethereum",
                address: "0x4d5f47fa6a74757f35c14fd3a6ef8e3c9bc514e8",
            },
            queryParams: { points: 1 },
        },
    },
    {
        id: "philidor#events",
        fixture: "endpoints/events/fixtures/happy.json",
        input: { queryParams: { limit: 1, relevance: "highlights" } },
    },
    {
        id: "philidor#security-events",
        fixture: "endpoints/security-events/fixtures/happy.json",
        input: { queryParams: { limit: 1, hasLoss: "true" } },
    },
    {
        id: "philidor#signals",
        fixture: "endpoints/signals/fixtures/happy.json",
        input: { queryParams: { limit: 1 } },
    },
    {
        id: "philidor#rwa",
        fixture: "endpoints/rwa/fixtures/happy.json",
        input: { queryParams: { limit: 1, review_status: "reviewed" } },
    },
    {
        id: "philidor#rwa/{asset_id}",
        fixture: "endpoints/rwa-detail/fixtures/happy.json",
        input: { pathParams: { asset_id: "3881" } },
    },
    {
        id: "philidor#markets",
        fixture: "endpoints/markets/fixtures/happy.json",
        input: {
            queryParams: {
                limit: 1,
                sortBy: "total_supplied_usd",
                sortOrder: "desc",
            },
        },
    },
    {
        id: "philidor#markets/{id}",
        fixture: "endpoints/market-detail/fixtures/happy.json",
        input: { pathParams: { id: "aave-v3-1-ethereum" } },
    },
];

/** Validate through the estimate path, which compiles and checks input without IO. */
const estimate = async (id: string, input: RunInput) => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return await loaded.estimate(input);
};

Deno.test("philidor docs: nine free read tools share auth and error handling", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("philidor#")
    ).sort();
    assertEquals(ids, CASES.map(({ id }) => id).sort());

    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assertEquals(doc.usage.model, { kind: "FREE" }, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(
            doc.usage.estimate.$fn.key,
            doc.usage.evidence.$fn.key,
            id,
        );
    }
});

for (const testCase of CASES) {
    Deno.test(`${testCase.id} happy (recorded): raw response, zero usage`, async () => {
        const unit = await testSealedUnit(testCase.id);
        const fixture = await loadFixture(`${HERE}${testCase.fixture}`);
        const result = await runEndpoint({
            unit,
            input: testCase.input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test("philidor provider error: normalized envelope and zero usage", async () => {
    const unit = await testSealedUnit("philidor#markets/{id}");
    const fixture = await loadFixture(
        `${HERE}endpoints/market-detail/fixtures/provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "not-a-market" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Market not found",
    );
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "NOT_FOUND",
    );
});

Deno.test("philidor input gates reject invalid and accept boundary filters", async () => {
    const invalid: ReadonlyArray<{ id: string; input: RunInput }> = [
        {
            id: "philidor#vaults",
            input: { queryParams: { limit: 101 } },
        },
        {
            id: "philidor#events",
            input: { queryParams: { daysBack: 731 } },
        },
        {
            id: "philidor#rwa",
            input: { queryParams: { category: "nft" } },
        },
        {
            id: "philidor#rwa/{asset_id}",
            input: { pathParams: { asset_id: "not-numeric" } },
        },
    ];

    for (const testCase of invalid) {
        const unit = await testSealedUnit(testCase.id);
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: testCase.input,
                    mode: "replay",
                    fixture: {
                        name: "unused",
                        description: "unused",
                        calls: [],
                    },
                }),
            Error,
            "INVALID_INPUT",
        );
    }

    const valid: ReadonlyArray<{ id: string; input: RunInput }> = [
        {
            id: "philidor#vaults",
            input: { queryParams: { limit: 100 } },
        },
        {
            id: "philidor#events",
            input: { queryParams: { daysBack: 730 } },
        },
        {
            id: "philidor#rwa",
            input: { queryParams: { category: "tokenized_treasury" } },
        },
        {
            id: "philidor#rwa/{asset_id}",
            input: { pathParams: { asset_id: "3881" } },
        },
    ];

    for (const testCase of valid) {
        assertEquals(
            await estimate(testCase.id, testCase.input),
            { credits: {}, evidence: {} },
            testCase.id,
        );
    }
});

Deno.test({
    name: "philidor#events live (gated on PHILIDOR_API_KEY)",
    ignore: liveSkip("philidor"),
    fn: async () => {
        const unit = await testSealedUnit("philidor#events");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { limit: 1, relevance: "highlights" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(Array.isArray((result.output as Record<string, unknown>).data));
    },
});
