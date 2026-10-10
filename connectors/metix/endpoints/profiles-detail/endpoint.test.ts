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
const ids = ["SyNtHeTiCpRoFiLe0000A1", "SyNtHeTiCpRoFiLe0000B2"];

Deno.test("metix#entity/v1/profiles/detail-by-id happy (synthetic): found is a COUNT", async () => {
    const unit = await testSealedUnit("metix#entity/v1/profiles/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-profiles-detail-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { profile_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // `found` is an INTEGER on this route, not an array of records: the
    // settle reads it as a number, and reading it as a length would throw
    // on the type. ceil(2 / 5) = 1.
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
    assertEquals(data.found, 2);
    assertEquals(data.not_found, []);
    assertEquals((data.results as Json[]).length, 2);
});

Deno.test("metix#entity/v1/profiles/detail-by-id none found (synthetic): bills 0", async () => {
    const unit = await testSealedUnit("metix#entity/v1/profiles/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-profiles-detail-none-found.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                profile_ids: [
                    "SyNtHeTiCmIsSiNg00001",
                    "SyNtHeTiCmIsSiNg00002",
                ],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Not-found results are free, and a zero count must settle zero rather
    // than rounding one empty block up to a credit.
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const data = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >;
    assertEquals(data.found, 0);
    assertEquals((data.not_found as Json[]).length, 2);
});

Deno.test("metix#entity/v1/profiles/detail-by-id provider error (401): zero usage", async () => {
    const unit = await testSealedUnit("metix#entity/v1/profiles/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { profile_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#entity/v1/profiles/detail-by-id: the schema gate — 1 to 100 IDs", async () => {
    const unit = await testSealedUnit("metix#entity/v1/profiles/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-profiles-detail-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { profile_ids: [] },
        { profile_ids: Array(101).fill("x") },
        { profile_ids: "SyNtHeTiCpRoFiLe0000A1" },
        { profile_ids: [1, 2] },
        { job_ids: ids },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 120),
        );
    }
    const passing: Json[] = [
        { profile_ids: ["x"] },
        { profile_ids: Array(100).fill("x") },
        { profile_ids: ids, _source: false },
        { profile_ids: ids, _source: ["full_name", "experience.company"] },
        { profile_ids: ids, _source: null },
        // NOT strict, faithfully: unlike the search routes the vendor does
        // not declare additionalProperties false here, and it accepts
        // `source` as an alias for `_source`.
        { profile_ids: ids, source: ["full_name"] },
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

Deno.test("metix#entity/v1/profiles/detail-by-id invalid id (recorded 400): zero usage", async () => {
    const unit = await testSealedUnit("metix#entity/v1/profiles/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-invalid-id.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { profile_ids: ["aNiDtHiSaPiNeVeRiSsUeD"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // An ID this API did not issue is REFUSED, not reported as not found,
    // and the message names the offending index. Verified live: a company
    // ID sent to the jobs read answers the same 400 and settles zero.
    const output = result.output as Record<string, Json>;
    assertEquals(output.error_code, "invalid_id");
    assertEquals(
        output.docs_url,
        "https://platform.metix.ai/docs/reference/errors#invalid-ids",
    );
});

Deno.test({
    name:
        "metix#entity/v1/profiles/detail-by-id live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        // A read needs IDs a search returned, so the live test searches
        // first and reads what it got. Both calls are billed.
        const searchUnit = await testSealedUnit("metix#v1/people/query");
        const found = await runEndpoint({
            unit: searchUnit,
            input: {
                body: {
                    where: {
                        all: [{ field: "current_title", match: "engineer" }],
                    } as Json,
                    size: 2,
                },
            },
            mode: "live",
        });
        assertEquals(found.isProviderError, false);
        const searchData = (found.output as Record<string, Json>)
            .data as Record<
                string,
                Json
            >;
        const liveIds = searchData.profile_ids as string[];
        assert(liveIds.length > 0, "the search returned at least one ID");

        const unit = await testSealedUnit(
            "metix#entity/v1/profiles/detail-by-id",
        );
        const result = await runEndpoint({
            unit,
            input: { body: { profile_ids: liveIds } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const data = (result.output as Record<string, Json>).data as Record<
            string,
            Json
        >;
        assertEquals(typeof data.found, "number");
        assertEquals(result.usage.evidence.RESULT, data.found);
        assertEquals(result.usage.credits.default, 1);
    },
});
