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

Deno.test("jobspipe#v1/jobs/agentic-search happy: billed like search — one credit per posting, the vendor's claim consolidated away", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/agentic-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query:
                    "senior backend engineer in Berlin, visa sponsorship, hybrid ok",
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, Json>;
    const metadata = output.metadata as Record<string, Json>;
    assertEquals("credits_charged" in metadata, false);
    // the plan rides through as transparency
    assertEquals((metadata.agentic as Record<string, Json>).rounds, 1);
    // the vendor says truncated_results 0 on this surface even with rows
    // in data[] — evidence counts the rows, never the metadata
    assertEquals(metadata.truncated_results, 0);
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test("jobspipe#v1/jobs/agentic-search provider error (synthetic): 503 switched-off is data, zero usage", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/agentic-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: { query: "senior backend engineer in Berlin", limit: 5 },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Agentic search is switched off",
        raw: { error: "Agentic search is switched off" },
    });
});

Deno.test("jobspipe#v1/jobs/agentic-search: query + limit gate the wire; limit is the estimate", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/agentic-search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        // limit REQUIRED at the binding (vendor default 10 — D25)
        { query: "senior backend engineer in Berlin" },
        // vendor bounds: query 2–500 chars, limit 1–25
        { query: "x", limit: 2 },
        { query: "senior backend engineer in Berlin", limit: 26 },
        { query: "senior backend engineer in Berlin", limit: 0 },
        // the vendor rejects unknown top-level keys (additionalProperties
        // false) — so does the mirror
        { query: "senior backend engineer in Berlin", limit: 2, cursor: "x" },
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
    // unknown keys INSIDE filters are the vendor's to ignore — accepted
    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                query:
                    "senior backend engineer in Berlin, visa sponsorship, hybrid ok",
                filters: { job_country_code_or: ["DE"], bogus: 1 },
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: "data engineer in Austin", limit: 25 },
        }),
        { credits: { default: 25 }, evidence: { RESULT: 25 } },
    );
});

Deno.test({
    name: "jobspipe#v1/jobs/agentic-search live (gated on JOBSPIPE_API_KEY)",
    ignore: liveSkip("jobspipe"),
    fn: async () => {
        const unit = await testSealedUnit("jobspipe#v1/jobs/agentic-search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    query: "senior software engineer in the United States",
                    limit: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
