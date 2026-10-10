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
const ids = ["etG0t8D21nSG3hdZQ7Pr6A", "yNClo07hcPrSWC6FU4dzag"];

Deno.test("metix#entity/v1/jobs/detail-by-id happy (recorded): found is a COUNT", async () => {
    const unit = await testSealedUnit("metix#entity/v1/jobs/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-jobs-detail-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Two IDs requested and both found, which is what the recorded
    // fixture carries: ceil(2 / 5) = 1, a whole block for a partial
    // one, which is the published block rate.
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
    assertEquals((data.not_found as Json[]).length, 0);
    assertEquals((data.results as Json[]).length, 2);
});

Deno.test("metix#entity/v1/jobs/detail-by-id provider error (401): zero usage", async () => {
    const unit = await testSealedUnit("metix#entity/v1/jobs/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#entity/v1/jobs/detail-by-id: the schema gate — 1 to 100 IDs", async () => {
    const unit = await testSealedUnit("metix#entity/v1/jobs/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-jobs-detail-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { job_ids: [] },
        { job_ids: Array(101).fill("x") },
        { job_ids: "one-id-not-a-list" },
        { job_ids: [1, 2] },
        { profile_ids: ids },
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
        { job_ids: ["x"] },
        { job_ids: Array(100).fill("x") },
        { job_ids: ids, _source: false },
        { job_ids: ids, _source: null },
        // NOT strict, faithfully: the vendor does not declare
        // additionalProperties false on the detail routes.
        { job_ids: ids, source: ["name"] },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(
            ok.isProviderError,
            false,
            JSON.stringify(body).slice(0, 80),
        );
    }
});

Deno.test("metix#entity/v1/jobs/detail-by-id invalid id (recorded 400): zero usage", async () => {
    const unit = await testSealedUnit("metix#entity/v1/jobs/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-invalid-id.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_ids: ["aNiDtHiSaPiNeVeRiSsUeD"] } },
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
        "metix#entity/v1/jobs/detail-by-id live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        // A read needs IDs a search returned, so search first.
        const searchUnit = await testSealedUnit("metix#v1/jobs/query");
        const found = await runEndpoint({
            unit: searchUnit,
            input: {
                body: {
                    where: { all: [{ field: "title", exists: true }] } as Json,
                    size: 2,
                },
            },
            mode: "live",
        });
        assertEquals(found.isProviderError, false);
        const searchData = (found.output as Record<string, Json>)
            .data as Record<string, Json>;
        const liveIds = searchData.job_ids as string[];
        assertEquals(liveIds.length > 0, true);

        const unit = await testSealedUnit(
            "metix#entity/v1/jobs/detail-by-id",
        );
        const result = await runEndpoint({
            unit,
            input: { body: { job_ids: liveIds } },
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
    },
});
