import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("jobspipe#v1/stack/scan happy: one credit for a scan that detected something, detections untouched", async () => {
    const unit = await testSealedUnit("jobspipe#v1/stack/scan");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "vercel.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the vendor's rule: one credit when the scan delivered detections
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    // the whole scan, untouched: no meter in this body, nothing plucked
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, Json>;
    assertEquals(output.domain, "vercel.com");
    const detected = output.detected as Record<string, Json>[];
    assertEquals(detected.map((d) => d.slug), [
        "linkedin-insight-tag",
        "amazon-s3",
    ]);
});

Deno.test("jobspipe#v1/stack/scan empty: a scan that detected nothing costs nothing", async () => {
    const unit = await testSealedUnit("jobspipe#v1/stack/scan");
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "stripe.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // http_status 0 + detected [] is a 200 upstream, but JobsPipe hands
    // its gate credit back when a flat route delivered nothing
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    const output = result.output as Record<string, Json>;
    assertEquals(output.http_status, 0);
    assertEquals(output.detected, []);
});

Deno.test("jobspipe#v1/stack/scan provider error: 400 invalid domain is data, zero usage", async () => {
    const unit = await testSealedUnit("jobspipe#v1/stack/scan");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domain: "not a domain" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "not a valid domain: not a domain",
        raw: { error: "not a valid domain: not a domain" },
    });
});

Deno.test("jobspipe#v1/stack/scan: domain required, mode is the vendor's enum, nothing else accepted; estimate is the flat call", async () => {
    const unit = await testSealedUnit("jobspipe#v1/stack/scan");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        {},
        { domain: "" },
        { domain: "stripe.com", mode: "fast" },
        { domain: "stripe.com", url: "https://stripe.com" },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // the mirror carries no default: `mode` is the vendor's to default
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        Record<string, Json>
    >;
    assertEquals(properties.mode.default, undefined);
    assertEquals(properties.mode.enum, ["auto", "html", "render"]);
    // the promise is the one credit a productive scan costs
    assertEquals(
        await estimateEndpoint(unit, {
            body: { domain: "stripe.com", mode: "render" },
        }),
        { credits: { default: 1 }, evidence: { CREDIT: 1 } },
    );
});

Deno.test({
    name: "jobspipe#v1/stack/scan live (gated on JOBSPIPE_API_KEY)",
    ignore: liveSkip("jobspipe"),
    fn: async () => {
        const unit = await testSealedUnit("jobspipe#v1/stack/scan");
        const result = await runEndpoint({
            unit,
            input: { body: { domain: "vercel.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const detected = (result.output as Record<string, Json>).detected;
        assertEquals(Array.isArray(detected), true);
        // shape, not amounts: the scan's own 0/1 evidence line is present;
        // the exact credit per outcome is pinned by the replay tests
        assertEquals(Object.keys(result.usage.evidence), ["CREDIT"]);
        assertEquals(typeof result.usage.evidence.CREDIT, "number");
    },
});
