import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apollo#mixed_people/api_search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { "person_titles[]": ["cto"], per_page: 2 } };

Deno.test(`${ID} happy (synthetic): a page of previews is free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing to count, nothing to draw (design D3)
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (result.output as { people: unknown[] }).people.length,
        2,
    );
});

Deno.test(`${ID} provider error (synthetic 403 API_INACCESSIBLE): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the compiled schema gates the filters`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (queryParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: queryParams as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            { ...INPUT.queryParams, not_an_apollo_filter: "x" },
            { "person_seniorities[]": ["boss"] },
            { page: 501 },
            { "organization_job_posted_at_range[min]": "2024-02-30" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twins pass validation (they fail later, at replay URL
    // matching — proving the gate let them through)
    for (
        const good of [
            { "person_seniorities[]": ["c_suite"], page: 500 },
            { "organization_job_posted_at_range[min]": "2024-02-29" },
        ]
    ) {
        const error = await assertRejects(() => run(good));
        assertEquals(
            String(error).includes("INVALID_INPUT"),
            false,
            String(error),
        );
    }
});

Deno.test({
    name: `${ID} live (gated on APOLLO_API_KEY)`,
    ignore: liveSkip("apollo"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).people),
            true,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
