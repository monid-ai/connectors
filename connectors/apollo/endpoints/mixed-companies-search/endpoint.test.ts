import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apollo#mixed_companies/search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    queryParams: {
        "q_organization_domains_list[]": ["apollo.io"],
        per_page: 2,
    },
};

Deno.test(`${ID} happy (synthetic): one non-empty page bills one credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // no vendor meter on the response: the derived fold settles, so no
    // mismatch key can appear (zUsage is strict — deep-equality proves it)
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { PAGE: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (result.output as { organizations: unknown[] }).organizations.length,
        2,
    );
});

Deno.test(`${ID} empty (synthetic): a page with no company draws nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                "q_organization_domains_list[]": ["nope.invalid"],
                per_page: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test(`${ID} provider error (synthetic 403, paid plans only): zero usage`, async () => {
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
            { "organization_num_employees_ranges[]": ["1-10"] },
            { per_page: 101 },
            { "latest_funding_date_range[min]": "2024-13-01" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twins pass validation (they fail later, at replay URL
    // matching — proving the gate let them through)
    for (
        const good of [
            { "organization_num_employees_ranges[]": ["1,10"], per_page: 100 },
            { "latest_funding_date_range[min]": "2024-12-01" },
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
            Array.isArray(
                (result.output as Record<string, unknown>).organizations,
            ),
            true,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["PAGE"]);
    },
});
