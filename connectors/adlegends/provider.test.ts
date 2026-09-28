import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

/**
 * Provider-level suite (fixture strategy v2): every Ad Legends endpoint
 * shares POST /api/mcp/brands, so one interned lifecycle.start and three
 * shared chains cover the envelope. Per-endpoint files add schema gates
 * and a gated live probe.
 */

const chains = fromFileUrl(new URL("./fixtures/", import.meta.url));

const IDS = [
    "adlegends#get_started",
    "adlegends#whoami",
    "adlegends#get_credit_status",
    "adlegends#list_brands",
    "adlegends#get_brand",
    "adlegends#get_brand_memory",
    "adlegends#create_brand_from_url",
    "adlegends#create_manual_brand",
    "adlegends#create_ads",
    "adlegends#get_ad_session",
    "adlegends#list_ad_sessions",
] as const;

const INPUTS: Record<(typeof IDS)[number], RunInput> = {
    "adlegends#get_started": { body: { intent: "explore" } },
    "adlegends#whoami": { body: {} },
    "adlegends#get_credit_status": { body: { requiredCredits: 9 } },
    "adlegends#list_brands": { body: {} },
    "adlegends#get_brand": { body: { brandId: 1 } },
    "adlegends#get_brand_memory": { body: { brandId: 1 } },
    "adlegends#create_brand_from_url": {
        body: { url: "https://example.com" },
    },
    "adlegends#create_manual_brand": {
        body: { name: "Example — Test", requestId: "retry-1" },
    },
    "adlegends#create_ads": {
        body: {
            brandId: 1,
            targetAudience: "independent shop owners",
            keyMessage: "looks legendary, priced like Tuesday",
            tone: "bold",
        },
    },
    "adlegends#get_ad_session": { body: { sessionId: 1 } },
    "adlegends#list_ad_sessions": { body: { brandId: 1 } },
};

Deno.test("adlegends: eleven MCP tools share one interned lifecycle.start", async () => {
    const bundle = await testBundle();
    const first = bundle.endpoints[IDS[0]];
    assert(first.lifecycle?.start, "get_started must inherit lifecycle.start");
    const startKey = first.lifecycle.start.$fn.key;
    const fromResponseKey = first.output.fromResponse?.$fn.key;
    const fromErrorKey = first.output.fromError?.$fn.key;
    assert(fromResponseKey);
    assert(fromErrorKey);
    for (const id of IDS) {
        const doc = bundle.endpoints[id];
        assert(doc, `${id} missing`);
        assertEquals(doc.request.method, "POST", id);
        assertEquals(
            doc.request.url,
            "https://www.adlegends.ai/api/mcp/brands",
            id,
        );
        assertEquals(doc.lifecycle?.start?.$fn.key, startKey, id);
        assertEquals(doc.lifecycle?.poll, undefined, id);
        assertEquals(doc.output.fromResponse?.$fn.key, fromResponseKey, id);
        assertEquals(doc.output.fromError?.$fn.key, fromErrorKey, id);
        assertEquals(doc.usage.model.kind, "FREE", id);
        assertEquals(doc.usage.consolidate, undefined, id);
        const creds = doc.auth.credentials as { required?: string[] };
        assertEquals(creds.required, ["apiKey"], id);
    }
});

for (const id of IDS) {
    Deno.test(`${id} happy (synthetic): unwraps structuredContent, FREE`, async () => {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: INPUTS[id],
            mode: "replay",
            fixture: await loadFixture(`${chains}synthetic-tool-ok.json`),
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, { ok: true, nextTool: "get_started" });
    });

    Deno.test(`${id} JSON-RPC error on HTTP 200: synthesized 400, zero usage`, async () => {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: INPUTS[id],
            mode: "replay",
            fixture: await loadFixture(`${chains}synthetic-jsonrpc-error.json`),
        });
        assertEquals(result.httpStatus, 400);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as {
            message: string;
            code: number;
            raw: Record<string, unknown>;
        };
        assertEquals(output.message, "Invalid params");
        assertEquals(output.code, -32602);
        assertEquals(
            (output.raw.error as { message: string }).message,
            "Invalid params",
        );
    });

    Deno.test(`${id} 401: Bearer missing is data, digested, zero usage`, async () => {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input: INPUTS[id],
            mode: "replay",
            fixture: await loadFixture(`${chains}synthetic-unauthorized.json`),
        });
        assertEquals(result.httpStatus, 401);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as { message: string; code: number };
        assertEquals(output.message, "Missing or malformed Bearer token");
        assertEquals(output.code, -32001);
    });
}

Deno.test("adlegends#get_brand tool isError on HTTP 200: synthesized 400", async () => {
    const unit = await testSealedUnit("adlegends#get_brand");
    const result = await runEndpoint({
        unit,
        input: INPUTS["adlegends#get_brand"],
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-tool-error.json`),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string };
    assertEquals(output.message, "brand not found");
});

Deno.test({
    name: "adlegends#get_started live (gated on ADLEGENDS_API_KEY)",
    ignore: liveSkip("adlegends"),
    fn: async () => {
        const unit = await testSealedUnit("adlegends#get_started");
        const result = await runEndpoint({
            unit,
            input: { body: { intent: "explore" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
    },
});
