import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apollo#news_articles/search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { "organization_ids[]": ["ORG1"], per_page: 2 } };

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
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { PAGE: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (result.output as { news_articles: unknown[] }).news_articles.length,
        2,
    );
});

Deno.test(`${ID} empty (synthetic): a page with no article draws nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { "organization_ids[]": ["ORG2"], per_page: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test(`${ID} provider error (synthetic 429 rate limit): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the compiled schema requires the organization ids and caps the page`, async () => {
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
            { per_page: 2 },
            { "organization_ids[]": [], per_page: 2 },
            { "organization_ids[]": ["ORG1"], per_page: 26 },
            {
                "organization_ids[]": ["ORG1"],
                "published_at[min]": "2025-2-15",
            },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes validation (it fails later, at replay URL
    // matching — proving the gate let it through)
    const error = await assertRejects(() =>
        run({
            "organization_ids[]": ["ORG1"],
            per_page: 25,
            "published_at[min]": "2025-02-15",
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: `${ID} live (gated on APOLLO_API_KEY)`,
    ignore: liveSkip("apollo"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            // Apollo.io's own organization id, from its reference examples
            input: {
                queryParams: {
                    "organization_ids[]": ["5e66b6381e05b4008c8331b8"],
                    per_page: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            Array.isArray(
                (result.output as Record<string, unknown>).news_articles,
            ),
            true,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["PAGE"]);
    },
});
