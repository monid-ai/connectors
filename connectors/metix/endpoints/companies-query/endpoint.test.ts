import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const where = {
    all: [{ field: "linkedin_followers", gte: 30000000 }],
} as Json;

Deno.test("metix#v1/companies/query happy (recorded): 3 IDs, EXACT total, last page", async () => {
    const unit = await testSealedUnit("metix#v1/companies/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-companies-query-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // ceil(3 / 25) = 1
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 3 },
    });
    // The envelope rides through untouched and carries no billing field:
    // `usage.consolidate` is absent because there is no vendor meter to
    // lift, so nothing can be left behind in the output either.
    const output = result.output as Record<string, Json>;
    assertEquals(output.code, 200);
    assertEquals(output.msg, "ok");
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("charged_credits" in output, false);
    const data = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >;
    assertEquals((data.company_ids as Json[]).length, 3);
    // An EXACT integer total, in contrast with the jobs search's banded
    // "100000+": the contract declares the union because both occur.
    assertEquals(data.total, 3);
    // A null cursor is how a caller knows to stop.
    assertEquals(data.next, null);
});

Deno.test("metix#v1/companies/query provider error (401): zero usage", async () => {
    const unit = await testSealedUnit("metix#v1/companies/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#v1/companies/query: the schema gate", async () => {
    const unit = await testSealedUnit("metix#v1/companies/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-companies-query-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { where },
        { where, size: 0 },
        { where, size: 10001 },
        { where, size: 1, sizee: 1 },
        { size: 1 },
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
    const ok = await runEndpoint({
        unit,
        input: { body: { where, size: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "metix#v1/companies/query live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        const unit = await testSealedUnit("metix#v1/companies/query");
        const result = await runEndpoint({
            unit,
            input: { body: { where, size: 5 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        const data = (result.output as Record<string, Json>).data as Record<
            string,
            Json
        >;
        assertEquals(Array.isArray(data.company_ids), true);
    },
});
