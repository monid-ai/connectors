import type { Json, RunInput } from "@shared/core";
import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const fixtureRoot = fromFileUrl(new URL("./fixtures/", import.meta.url));
const names = ["get_setup_status", "get_cash_flow", "list_recurring"];
const inputFor = (name: string): RunInput => ({
    body: name === "get_cash_flow" ? { startDate: null, endDate: null } : {},
});

for (const name of names) {
    Deno.test(`betteroff#${name}: preserves the structured financial result`, async () => {
        const unit = await testSealedUnit(`betteroff#${name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-success.json`,
        );
        const result = await runEndpoint({
            unit,
            input: inputFor(name),
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(
            result.output,
            (fixture.calls[0].res.body as {
                result: { structuredContent: unknown };
            }).result.structuredContent,
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
    Deno.test(`betteroff#${name}: sends only the selected tool and resolver credential`, async () => {
        const unit = await testSealedUnit(`betteroff#${name}`);
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-success.json`,
        );
        const engine = new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ accessToken: "synthetic-token" }),
                fetch: async (url, init) => {
                    assertEquals(
                        String(url),
                        "https://api.betteroff.finance/mcp",
                    );
                    assertEquals(init?.method, "POST");
                    assertEquals(
                        new Headers(init?.headers).get("Authorization"),
                        "Bearer synthetic-token",
                    );
                    assertEquals(
                        new Headers(init?.headers).get("MCP-Protocol-Version"),
                        "2025-03-26",
                    );
                    assertEquals(JSON.parse(String(init?.body)), {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "tools/call",
                        params: {
                            name: `betteroff_${name}`,
                            arguments: inputFor(name).body,
                        },
                    });
                    return new Response(
                        JSON.stringify(fixture.calls[0].res.body),
                        { status: 200 },
                    );
                },
            }),
        });
        const loaded = await engine.load(unit);
        await loaded.run(inputFor(name));
    });
}
for (
    const [scenario, expectedStatus] of [
        ["unauthorized", 401],
        ["forbidden", 403],
        ["tool-error", 502],
        ["rpc-error", 502],
        ["malformed", 502],
    ] as const
) {
    Deno.test(`betteroff: ${scenario} remains an error with zero usage`, async () => {
        const unit = await testSealedUnit("betteroff#get_setup_status");
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-${scenario}.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body: {} },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.httpStatus, expectedStatus);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}
Deno.test("betteroff: model input cannot select another household, tool, or credential", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    for (
        const body of ([{ householdId: "other" }, { accessToken: "injected" }, {
            name: "betteroff_request_transfer",
        }] as Json[])
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});
Deno.test("betteroff: missing credential fails before transport", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: () => {
                throw new Error("Must not fetch");
            },
        }),
    });
    await assertRejects(
        async () => (await engine.load(unit)).run({ body: {} }),
        Error,
        "credentials invalid",
    );
});

Deno.test("betteroff: incomplete success envelope fails output validation", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-success.json`);
    fixture.calls[0].res.body = {
        jsonrpc: "2.0",
        id: 1,
        result: { structuredContent: { ok: true } },
    };
    await assertRejects(
        () =>
            runEndpoint({ unit, input: { body: {} }, mode: "replay", fixture }),
        Error,
        "CONTRACT_VIOLATION",
    );
});
Deno.test("betteroff: invalid date or missing required nullable field fails before transport", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    for (
        const body of [{ startDate: "2026-02-30", endDate: null }, {
            startDate: null,
        }] as Json[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});
