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

Deno.test("jobspipe#v1/companies/{key} happy: one flat credit, no meter in the body, record untouched", async () => {
    const unit = await testSealedUnit("jobspipe#v1/companies/{key}");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { key: "stripe.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // flat PER_CALL: the engine appends the CALL 1; no consolidate claim
    // (nothing at $.metadata.credits_charged) ⇒ the fold is the bill
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    // the whole record, untouched: no meter in this body, nothing plucked
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, Json>;
    assertEquals(output.domain, "stripe.com");
    assertEquals(output.employee_count, 16983);
});

Deno.test("jobspipe#v1/companies/{key} miss: 404 is data, zero usage, digested", async () => {
    const unit = await testSealedUnit("jobspipe#v1/companies/{key}");
    const fixture = await loadFixture(`${fixturesDir}miss.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { key: "no-such-company-zzzz.example" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "company_not_found",
        raw: { error: "company_not_found" },
    });
});

Deno.test("jobspipe#v1/companies/{key}: the key is required, 1–253 chars, nothing else accepted; estimate is the flat call", async () => {
    const unit = await testSealedUnit("jobspipe#v1/companies/{key}");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Record<string, string>[] = [
        {},
        { key: "" },
        { key: "a".repeat(254) },
        { key: "stripe.com", bogus: "1" },
    ];
    for (const pathParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(pathParams),
        );
    }
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { key: "stripe.com" } }),
        { credits: { default: 1 }, evidence: { CALL: 1 } },
    );
});

Deno.test({
    name: "jobspipe#v1/companies/{key} live (gated on JOBSPIPE_API_KEY)",
    ignore: liveSkip("jobspipe"),
    fn: async () => {
        const unit = await testSealedUnit("jobspipe#v1/companies/{key}");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { key: "stripe.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the flat call settled on the default pool
        assertEquals(Object.keys(result.usage.credits), ["default"]);
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
        assertEquals(
            (result.output as Record<string, Json>).domain,
            "stripe.com",
        );
    },
});
