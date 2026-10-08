import { assert, assertEquals, assertRejects } from "@std/assert";
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

Deno.test("jobspipe#v1/jobs/search happy: one credit per job, the vendor's credits_charged claim agrees with the fold and is consolidated away", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_title_or: ["data engineer"],
                job_country_code_or: ["US"],
                posted_at_max_age_days: 30,
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // D27 claim-wins: metadata.credits_charged (2) IS the bill; the fold
    // (2 rows, none already paid, no technologies asked for) also says 2,
    // so no mismatch key (zUsage is strict)
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { postings: 2, technologies: 0 },
    });
    const output = result.output as Record<string, Json>;
    const metadata = output.metadata as Record<string, Json>;
    // the meter left the payload; the rest of metadata rides through
    assertEquals("credits_charged" in metadata, false);
    assertEquals(metadata.jobs_already_paid, 0);
    assertEquals(typeof metadata.next_cursor, "string");
    assertEquals(typeof metadata.credits_remaining, "number");
    const rows = output.data as Record<string, Json>[];
    assertEquals(rows.map((r) => r.id), [
        "bcf7fa21f837a788",
        "fe3d8af1f9eb7919",
    ]);
});

Deno.test("jobspipe#v1/jobs/search already-paid (synthetic): rows paid earlier this month are free — the fold subtracts them and agrees with the claim", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-already-paid.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_title_or: ["data engineer"],
                job_country_code_or: ["US"],
                limit: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // 3 rows, 2 of them jobs_already_paid ⇒ 1 billable posting, which is
    // exactly the vendor's claim — no mismatch
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { postings: 1, technologies: 0 },
    });
});

Deno.test("jobspipe#v1/jobs/search all already paid (synthetic): a zero claim is pruned at settle, so the fold must bill nothing for a fully-paid page", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-all-already-paid.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_title_or: ["data engineer"],
                job_country_code_or: ["US"],
                limit: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // credits_charged: 0 with 3 rows — the claim prunes to empty and the
    // fold (3 − 3 already paid) settles the same zero
    assertEquals(result.usage, {
        credits: {},
        evidence: { postings: 0, technologies: 0 },
    });
    const metadata = (result.output as Record<string, Json>)
        .metadata as Record<string, Json>;
    assertEquals(metadata.jobs_already_paid, 3);
});

Deno.test("jobspipe#v1/jobs/search technologies: the include_technologies opt-in is a second line, one credit per posting that names a technology", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(`${fixturesDir}technologies.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_title_or: ["data engineer"],
                job_country_code_or: ["US"],
                posted_at_max_age_days: 30,
                limit: 2,
                include_technologies: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the vendor's claim (credits_charged: 4) already folds the technology
    // credits in; our two components reproduce it: 2 postings + 2 postings
    // naming at least one technology
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { postings: 2, technologies: 2 },
    });
    const output = result.output as Record<string, Json>;
    const metadata = output.metadata as Record<string, Json>;
    assertEquals("credits_charged" in metadata, false);
    assertEquals(metadata.technologies_credits_charged, 2);
    assertEquals(metadata.technologies_already_paid, 0);
    const rows = output.data as Record<string, Json>[];
    assertEquals(rows.length, 2);
    for (const row of rows) {
        assert(Array.isArray(row.technologies));
        assert((row.technologies as unknown[]).length > 0);
    }
});

Deno.test("jobspipe#v1/jobs/search empty: a 200 with no postings bills nothing", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { job_title_or: ["zzzz-no-such-title-qqq"], limit: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { postings: 0, technologies: 0 },
    });
});

Deno.test("jobspipe#v1/jobs/search provider error (synthetic): 402 quota is data, zero usage, digested with the raw body kept", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_title_or: ["data engineer"], limit: 1 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.message, "Monthly request quota exceeded");
    assertEquals(
        output.detail,
        "You have used all jobs included in your current plan (1 credit = 1 job returned). Upgrade or manage billing to continue.",
    );
    assertEquals(
        (output.raw as Record<string, Json>).credits_used,
        25000,
    );
});

Deno.test("jobspipe#v1/jobs/search: limit is REQUIRED at the binding and is the estimate; unknown filters are refused before the wire", async () => {
    const unit = await testSealedUnit("jobspipe#v1/jobs/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        // the primary limiting knob is the estimate's whole basis (D25)
        { job_title_or: ["data engineer"] },
        { job_title_or: ["data engineer"], limit: 0 },
        // JobsPipe rejects unknown parameters with 400 — so does the mirror
        { query: "data engineer", limit: 3 },
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
    // the caller-stated limit is the promise: 25 jobs ⇒ 25 credits
    const estimate = await estimateEndpoint(unit, {
        body: { job_country_code_or: ["US"], limit: 25 },
    });
    assertEquals(estimate, {
        credits: { default: 25 },
        evidence: { postings: 25, technologies: 0 },
    });
    // the opt-in doubles the ceiling: every returned job may name a
    // technology, and each one that does is one more credit
    assertEquals(
        await estimateEndpoint(unit, {
            body: {
                job_country_code_or: ["US"],
                limit: 25,
                include_technologies: true,
            },
        }),
        {
            credits: { default: 50 },
            evidence: { postings: 25, technologies: 25 },
        },
    );
    // the published bounds are the mirror's: at most 10 technology slugs,
    // non-negative revenue, 1–50 LEIs of 20 characters, one sort key
    for (
        const body of [
            { limit: 1, company_technology_slug_or: Array(11).fill("dbt") },
            { limit: 1, min_revenue_usd: -1 },
            { limit: 1, lei_or: [] },
            { limit: 1, lei_or: ["too-short"] },
            {
                limit: 1,
                order_by: [{ field: "posted_at" }, { field: "posted_at" }],
            },
        ] as Json[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // the compiled schema is the published surface: cursor + order_by are
    // in, the deprecated no-op `blur_company_data` is not
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert("cursor" in properties);
    assert("order_by" in properties);
    assert(!("blur_company_data" in properties));
});

Deno.test({
    name: "jobspipe#v1/jobs/search live (gated on JOBSPIPE_API_KEY)",
    ignore: liveSkip("jobspipe"),
    fn: async () => {
        const unit = await testSealedUnit("jobspipe#v1/jobs/search");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    job_title_or: ["software engineer"],
                    job_country_code_or: ["US"],
                    posted_at_max_age_days: 7,
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
        // evidence carries both components; the bill is the vendor's own
        // claim, which depends on what this account already paid for this
        // month — assert the shape, not the amount
        assertEquals(Object.keys(result.usage.evidence), [
            "postings",
            "technologies",
        ]);
        assertEquals(typeof result.usage.credits.default, "number");
        const metadata = (result.output as Record<string, Json>)
            .metadata as Record<string, Json>;
        assert(!("credits_charged" in metadata));
    },
});
