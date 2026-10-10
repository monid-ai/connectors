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
const ids = ["SyNtHeTiCcOmPaNy0001A"];

Deno.test("metix#entity/v1/companies/detail-by-id happy (synthetic): found is a COUNT", async () => {
    const unit = await testSealedUnit("metix#entity/v1/companies/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-companies-detail-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { company_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // One found rounds up to one whole block of five, which is the
    // published block rate: ceil(1 / 5) = 1.
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const data = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >;
    assertEquals(data.found, 1);
    assertEquals((data.not_found as Json[]).length, 0);
    assertEquals((data.results as Json[]).length, 1);
});

Deno.test("metix#entity/v1/companies/detail-by-id provider error (401): zero usage", async () => {
    const unit = await testSealedUnit("metix#entity/v1/companies/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { company_ids: ids } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#entity/v1/companies/detail-by-id: the schema gate — 1 to 100 IDs", async () => {
    const unit = await testSealedUnit("metix#entity/v1/companies/detail-by-id");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-companies-detail-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { company_ids: [] },
        { company_ids: Array(101).fill("x") },
        { company_ids: "one-id-not-a-list" },
        { company_ids: [1, 2] },
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
        { company_ids: ["x"] },
        { company_ids: Array(100).fill("x") },
        { company_ids: ids, _source: false },
        { company_ids: ids, _source: null },
        // NOT strict, faithfully: the vendor does not declare
        // additionalProperties false on the detail routes.
        { company_ids: ids, source: ["name"] },
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

Deno.test({
    name:
        "metix#entity/v1/companies/detail-by-id live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        // A read needs IDs a search returned, so search first.
        const searchUnit = await testSealedUnit("metix#v1/companies/query");
        const found = await runEndpoint({
            unit: searchUnit,
            input: {
                body: {
                    where: { all: [{ field: "name", exists: true }] } as Json,
                    size: 2,
                },
            },
            mode: "live",
        });
        assertEquals(found.isProviderError, false);
        const searchData = (found.output as Record<string, Json>)
            .data as Record<string, Json>;
        const liveIds = searchData.company_ids as string[];
        assertEquals(liveIds.length > 0, true);

        const unit = await testSealedUnit(
            "metix#entity/v1/companies/detail-by-id",
        );
        const result = await runEndpoint({
            unit,
            input: { body: { company_ids: liveIds } },
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
