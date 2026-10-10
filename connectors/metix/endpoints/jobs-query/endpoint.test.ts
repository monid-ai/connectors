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
const where = { all: [{ field: "title", match: "data engineer" }] } as Json;

Deno.test("metix#v1/jobs/query happy (recorded): 2 IDs, BANDED total", async () => {
    const unit = await testSealedUnit("metix#v1/jobs/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-jobs-query-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // ceil(2 / 25) = 1
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 2 },
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
    assertEquals((data.job_ids as Json[]).length, 2);
    // `total` is integer-or-string: at or above 100000 it is the banded
    // string. A caller that assumes integer breaks here, which is why the
    // contract declares the union and the connector passes it through.
    assertEquals(data.total, "100000+");
});

Deno.test("metix#v1/jobs/query provider error (401): zero usage", async () => {
    const unit = await testSealedUnit("metix#v1/jobs/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#v1/jobs/query: the schema gate", async () => {
    const unit = await testSealedUnit("metix#v1/jobs/query");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-jobs-query-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { where },
        { where, size: 0 },
        { where, size: 10001 },
        { where, size: 3, sizee: 3 },
        { size: 3 },
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
        input: { body: { where, size: 3, after: null } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "metix#v1/jobs/query live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        const unit = await testSealedUnit("metix#v1/jobs/query");
        const result = await runEndpoint({
            unit,
            input: { body: { where, size: 3 } },
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
        assertEquals(Array.isArray(data.job_ids), true);
        const total = data.total;
        assertEquals(
            typeof total === "number" || typeof total === "string",
            true,
            "total is integer or the banded string",
        );
    },
});
