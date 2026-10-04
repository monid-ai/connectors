import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { BRIGHTDATA_KEYS } from "../../schema/auth.ts";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/** Validate-only run: the estimate derives the input without IO, so a
 *  rejecting transport proves whether a body passes the compiled gate
 *  (the litescrape idiom). */
const validates = async (body: Record<string, Json>) => {
    const engine = new Engine({
        transport: directTransport({
            params: () =>
                Promise.resolve({
                    apiKey: "test-key",
                    serpZone: "test-serp-zone",
                    unlockerZone: "test-unlocker-zone",
                }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit("brightdata#serp"));
    return await loaded.estimate({ body });
};

const rejects = (body: Record<string, Json>) =>
    assertRejects(() => validates(body), Error, "INVALID_INPUT");

Deno.test("brightdata#serp happy: no vendor meter, so the derived fold settles the run", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.google.com/search?q=solid+state+battery+suppliers&brd_json=1",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}serp-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Bright Data reports NO meter (design D3), so there is no claim to win:
    // the derived flat $0.0015 stands alone and nothing rides as mismatch.
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.usage.mismatch, undefined);
    // the parsed results page rides through untouched — no fromResponse
    const output = result.output as Record<string, unknown>;
    assertEquals((output.organic as unknown[]).length, 2);
    assertEquals(
        (output.general as Record<string, unknown>).search_engine,
        "google",
    );
});

Deno.test("brightdata#serp: the zone is credential material, absent from the caller's schema", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    // design D1: the vendor REQUIRES `zone` on the wire; auth.inject supplies
    // it at egress, so it must never be a caller argument
    assert(
        !("zone" in properties),
        "zone must not be in the caller-facing schema",
    );
    assertEquals(unit.doc.input.schema.body?.required, ["url", "format"]);
    // and it IS declared as credential material, one field per zone type
    assertEquals(BRIGHTDATA_KEYS, ["apiKey", "serpZone", "unlockerZone"]);
});

Deno.test("brightdata#serp: one flat rate per request — result count is not a billing input", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const model = unit.doc.usage.model;
    assert(model.kind === "PER_CALL", "serp is priced per request");
    assertEquals(model.consumes, { credit: "default", amount: 0.0015 });
});

Deno.test("brightdata#serp: a 200 whose headers name a failure is a provider error, even with a body", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://no-such-host-zz9q.invalid/search?q=x",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}serp-wrong-api.json`),
    });

    // design D4: the outer 200 only says Bright Data took the request. The
    // verdict is `x-brd-error-code` + `x-brd-status-code`, and the body is a
    // NON-empty explanation — the case a payload-delivery check would bill.
    assertEquals(result.httpStatus, 400);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // raw has no envelope to carry the headers, so the lifecycle lifts the
    // code into the `format: "json"` shape — the reason reaches the caller
    assertEquals(result.output, {
        status_code: 400,
        headers: { "x-brd-error-code": "wrong_api" },
        body: "This target URL isn't supported with SERP API, use the Web " +
            "Unlocker product for targeting this URL",
    });
});

Deno.test("brightdata#serp provider error: a rejected key is a plain-text 401, zero usage", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.google.com/search?q=pizza",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}invalid-token.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // design D5: Bright Data's errors are bare strings, and a string IS Json —
    // the sniffing decode renders it faithfully and no fromError reshapes it
    assertEquals(result.output, "Invalid token");
});

Deno.test("brightdata#serp schema gate: a bad format is rejected before the wire, its near twin passes", async () => {
    const url = "https://www.google.com/search?q=pizza&brd_json=1";
    // `format` is a two-value vendor enum, and required
    await rejects({ url, format: "html" });
    await rejects({ url });
    // and the url itself must be non-empty
    await rejects({ url: "", format: "raw" });
    // the near twin passes the gate — proving it is not simply too wide
    assertEquals(await validates({ url, format: "json" }), {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
});

Deno.test({
    name:
        "brightdata#serp live (gated on BRIGHTDATA_CREDENTIALS_{API_KEY,SERP_ZONE,UNLOCKER_ZONE})",
    ignore: liveSkip("brightdata", BRIGHTDATA_KEYS),
    fn: async () => {
        const unit = await testSealedUnit("brightdata#serp");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://www.google.com/search?q=deno+2+workspace&brd_json=1",
                    format: "raw",
                },
            },
            mode: "live",
        });
        // shape, not amounts. Bright Data can fail an unlock in-band —
        // outer 200, verdict in headers (design D4, intermittent live) — so
        // the live assertion pins the RULE in both directions rather than
        // assuming delivery: a failure is a zero-billed provider error that
        // names its code, and a success is billed and parses to fields.
        if (result.isProviderError) {
            assertEquals(result.providerHttpStatus, 200);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            const output = result.output as Record<string, unknown>;
            assertEquals(output.status_code, result.httpStatus);
            assert(
                typeof output.headers === "object" && output.headers !== null,
                "an in-band failure must carry its x-brd-* headers",
            );
        } else {
            assertEquals(result.usage.evidence, { CALL: 1 });
            assertEquals(typeof result.usage.credits.default, "number");
            const output = result.output as Record<string, unknown>;
            assert(
                Array.isArray(output.organic),
                "a delivered SERP payload must parse to fields",
            );
        }
    },
});
