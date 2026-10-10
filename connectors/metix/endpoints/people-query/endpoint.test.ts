import { assert, assertEquals, assertRejects } from "@std/assert";
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
    all: [{ field: "current_title", match: "data engineer" }],
} as Json;

Deno.test("metix#v1/people/query happy (synthetic): 2 IDs settle one block", async () => {
    const unit = await testSealedUnit("metix#v1/people/query");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-query-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // No consolidate, so no vendor claim: the derived fold IS the bill.
    // ceil(2 / 25) = 1.
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 2 },
    });
    // The envelope rides through untouched and carries no billing field.
    const output = result.output as Record<string, Json>;
    assertEquals(output.code, 200);
    assertEquals(output.msg, "ok");
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("charged_credits" in output, false);
    const data = output.data as Record<string, Json>;
    assertEquals((data.profile_ids as Json[]).length, 2);
    assertEquals(data.total, 5456);
    // The cursor is handed back verbatim: a caller can use it, because
    // reading the next page needs no credential the engine withholds.
    assertEquals(typeof data.next, "string");
});

Deno.test("metix#v1/people/query empty (synthetic): no matches bills 0", async () => {
    const unit = await testSealedUnit("metix#v1/people/query");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-query-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                where: {
                    all: [{ field: "current_title", match: "zzqxv no such" }],
                } as Json,
                size: 25,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const data = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >;
    assertEquals(data.profile_ids, []);
    assertEquals(data.next, null);
});

Deno.test("metix#v1/people/query provider error (401): data, zero usage", async () => {
    const unit = await testSealedUnit("metix#v1/people/query");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { where, size: 10 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // The refusal keeps error_code and docs_url, which is how an agent
    // recovers: fetch docs_url with .md added ahead of the fragment.
    const output = result.output as Record<string, Json>;
    assertEquals(output.error_code, "invalid_api_key");
    assertEquals(
        output.docs_url,
        "https://platform.metix.ai/docs/quickstart#run",
    );
});

Deno.test("metix#v1/people/query refused query (400): translated before billing", async () => {
    const unit = await testSealedUnit("metix#v1/people/query");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-query-refused.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                where: {
                    all: [{ field: "current_title", gte: "x" }],
                } as Json,
                size: 10,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).error_code,
        "query_spec",
    );
});

Deno.test("metix#v1/people/query: the schema gate — size required, strict, bounds", async () => {
    const unit = await testSealedUnit("metix#v1/people/query");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-query-ok.json`,
    );
    const rejected: Json[] = [
        {},
        // `size` is optional to the vendor and REQUIRED at this binding:
        // it is what the estimate is computed from.
        { where },
        { where, size: 0 },
        { where, size: 10001 },
        { where, size: 2.5 },
        { where, size: "2" },
        // Strict, as the vendor declares (additionalProperties: false), so
        // a misspelled key fails here instead of running with the vendor
        // defaults and being billed.
        { where, size: 2, sizee: 2 },
        { where, size: 2, limit: 2 },
        { size: 2 },
        { where, size: 2, after: "x".repeat(2049) },
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
    const passing: Json[] = [
        { where, size: 1 },
        { where, size: 10000 },
        { where, size: 2, after: null },
        { where, size: 2, after: "eyJhZnRlciI6Mn0" },
        // The tree is opaque by design: the live vocabulary is GET
        // /contract and the vendor refuses an unknown field with a 400,
        // so the connector does not pre-judge field names.
        {
            where: { any: [{ field: "skills", match: "spark" }] } as Json,
            size: 2,
        },
        { where: {} as Json, size: 2 },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});

Deno.test({
    name: "metix#v1/people/query live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        const unit = await testSealedUnit("metix#v1/people/query");
        const result = await runEndpoint({
            unit,
            input: { body: { where, size: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        assertEquals(result.usage.credits.default, 1);
        const data = (result.output as Record<string, Json>).data as Record<
            string,
            Json
        >;
        assert(Array.isArray(data.profile_ids), "profile_ids array present");
        assert(
            (data.profile_ids as Json[]).length <= 2,
            "no more IDs than the stated size",
        );
    },
});
