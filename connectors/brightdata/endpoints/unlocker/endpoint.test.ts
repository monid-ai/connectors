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
    const loaded = await engine.load(
        await testSealedUnit("brightdata#unlocker"),
    );
    return await loaded.estimate({ body });
};

const rejects = (body: Record<string, Json>) =>
    assertRejects(() => validates(body), Error, "INVALID_INPUT");

Deno.test("brightdata#unlocker happy: a markdown payload is a STRING, and rides through as one", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com",
                format: "raw",
                data_format: "markdown",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlocker-markdown-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    // the engine's sniffing decode: a body that is not JSON is the complete
    // raw body as a faithful string. No connector-side parsing is authored,
    // because none is needed.
    assertEquals(typeof result.output, "string");
    assert((result.output as string).startsWith("Example Domain"));
});

Deno.test("brightdata#unlocker: a target 404 is billable success, not a provider error", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com/nonexistent-page-xyz-123",
                format: "json",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlocker-target-404.json`),
    });

    // design D4: the ENVELOPE says whether Bright Data billed, and the
    // envelope is 200 — the unlock happened. The target's own status is a
    // field inside it, never the envelope's status.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    assertEquals(
        (result.output as Record<string, unknown>).status_code,
        404,
    );
});

Deno.test("brightdata#unlocker: a wrong zone is a plain-text 400, zero usage", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com", format: "raw" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}zone-not-found.json`),
    });

    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, 'zone "no_such_zone_xyz" not found');
});

Deno.test("brightdata#unlocker: a failed unlock under raw is a provider error, its code lifted into the output", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: { url: "https://example.com/", format: "raw", country: "aq" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlock-failed-raw.json`),
    });

    // design D4: outer 200, empty body, verdict only in the headers —
    // OURS is Bright Data's result status, THEIRS the 200 that carried it
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status_code: 502,
        headers: { "x-brd-error-code": "no_peers" },
        body: "",
    });
});

Deno.test("brightdata#unlocker: under json the verdict rides IN the body, and is read there too", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com/",
                format: "json",
                country: "aq",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlock-failed-json.json`),
    });

    // the outer envelope carries no x-brd-* header at all here, so a
    // header-only check would bill this; the body is the envelope instead
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status_code, 502);
    assertEquals(
        (output.headers as Record<string, unknown>)["x-brd-error-code"],
        "no_peers",
    );
});

Deno.test("brightdata: the twins share one wire path and are told apart by declared id", async () => {
    const serp = await testSealedUnit("brightdata#serp");
    const unlocker = await testSealedUnit("brightdata#unlocker");
    // same POST /request on both — the id is DECLARED precisely because the
    // native path would collide them (AGENT.md; the contactout posture)
    assertEquals(serp.doc.request.url, "https://api.brightdata.com/request");
    assertEquals(
        unlocker.doc.request.url,
        "https://api.brightdata.com/request",
    );
    assertEquals(serp.doc.request.method, "POST");
    assertEquals(unlocker.doc.request.method, "POST");
    assert(serp.doc.id !== unlocker.doc.id);
    // `render` and `debug` are Web Unlocker's alone — the SERP mirror does
    // not carry them (design D2)
    const unlockerProps = unlocker.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    const serpProps = serp.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert("render" in unlockerProps && "debug" in unlockerProps);
    assert(!("render" in serpProps) && !("debug" in serpProps));
});

Deno.test("brightdata#unlocker schema gate: the vendor's string-typed `render` is enforced, its near twin passes", async () => {
    const url = "https://example.com";
    // `render` is a STRING enum on the wire, not a boolean — the mirror
    // keeps the vendor's own type, so the friendlier spelling must fail
    await rejects({ url, format: "raw", render: true });
    await rejects({ url, format: "raw", data_format: "pdf" });
    await rejects({ url, format: "raw", debug: "true" });
    // the near twins pass the gate — proving it is not simply too wide
    assertEquals(
        await validates({
            url,
            format: "raw",
            render: "true",
            data_format: "markdown",
            debug: true,
        }),
        { credits: { default: 0.0015 }, evidence: { CALL: 1 } },
    );
});

Deno.test({
    name:
        "brightdata#unlocker live (gated on BRIGHTDATA_CREDENTIALS_{API_KEY,SERP_ZONE,UNLOCKER_ZONE})",
    ignore: liveSkip("brightdata", BRIGHTDATA_KEYS),
    fn: async () => {
        const unit = await testSealedUnit("brightdata#unlocker");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://example.com",
                    format: "raw",
                    data_format: "markdown",
                },
            },
            mode: "live",
        });
        // shape, not amounts; and delivery is not assumed (design D4): an
        // in-band failure is a zero-billed provider error naming its code
        if (result.isProviderError) {
            assertEquals(result.providerHttpStatus, 200);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            const output = result.output as Record<string, unknown>;
            assertEquals(output.status_code, result.httpStatus);
        } else {
            assertEquals(result.usage.evidence, { CALL: 1 });
            assertEquals(typeof result.usage.credits.default, "number");
            assertEquals(typeof result.output, "string");
        }
    },
});
