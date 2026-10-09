import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Apollo's PUBLISHED draw per endpoint — https://docs.apollo.io/docs/api-pricing
 * (checked 2026-09-16): 0 credits for people search, 1 credit per page of
 * organization search / job postings / news, 1 credit per matched record
 * on enrichment and the complete-info lookups.
 *
 * Apollo declares NO `usage.consolidate` (design D3): a synchronous
 * response carries no meter, so the DERIVED fold is the settled answer on
 * every run and no `mismatch` key can appear (zUsage is strict;
 * deep-equality proves its absence). This table is therefore the only
 * thing standing between a typo and a wrong bill — written as LITERALS on
 * purpose (clay D7a): deriving them from each doc's own model would make
 * the test a tautology. A new endpoint must state its row here.
 */
const RATE: Record<
    string,
    { input: RunInput; usage: Record<string, unknown> }
> = {
    "apollo#mixed_people/api_search": {
        input: { queryParams: { "person_titles[]": ["cto"], per_page: 2 } },
        usage: { credits: {}, evidence: {} },
    },
    "apollo#mixed_companies/search": {
        input: {
            queryParams: {
                "q_organization_domains_list[]": ["apollo.io"],
                per_page: 2,
            },
        },
        usage: { credits: { default: 1 }, evidence: { PAGE: 1 } },
    },
    "apollo#organizations/job_postings": {
        input: {
            pathParams: { organization_id: "ORG1" },
            queryParams: { per_page: 2 },
        },
        usage: { credits: { default: 1 }, evidence: { PAGE: 1 } },
    },
    "apollo#news_articles/search": {
        input: { queryParams: { "organization_ids[]": ["ORG1"], per_page: 2 } },
        usage: { credits: { default: 1 }, evidence: { PAGE: 1 } },
    },
    "apollo#people/match": {
        input: {
            queryParams: {
                first_name: "Jordan",
                last_name: "Blake",
                domain: "example.com",
            },
        },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "apollo#organizations/enrich": {
        input: { queryParams: { domain: "apollo.io" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "apollo#people/show": {
        input: { pathParams: { id: "PERSON1" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "apollo#organizations/show": {
        input: { pathParams: { id: "ORG1" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
};

const apolloIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("apollo#"))
        .sort();
};

Deno.test("apollo: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await apolloIds();
    assertEquals(ids.length, 8);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("apollo: every endpoint's happy run folds to its published draw", async () => {
    for (const [id, { input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        // fixture dir: endpoints/<wire path, slashes and underscores as
        // dashes>/fixtures/ — the folder rule (design D1)
        const fixture = await loadFixture(
            `${HERE}endpoints/${
                id.split("#")[1].replaceAll(/[/_]/g, "-")
            }/fixtures/synthetic-happy.json`,
        );
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        // nothing is stripped: no meter rides a sync Apollo response
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("apollo: usage fn provenance — one auth, per-endpoint evidence, interned estimates", async () => {
    const bundle = await testBundle();
    const ids = await apolloIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        // no vendor meter anywhere (design D3)
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
    }
    // the FREE search's estimate and evidence are compiler-synthesized
    const free = bundle.endpoints["apollo#mixed_people/api_search"];
    assertEquals(
        bundle.fnTable[free.usage.estimate.$fn.key].provenance,
        "core#usage.synthesizedEmpty",
    );
    assertEquals(
        bundle.fnTable[free.usage.evidence.$fn.key].provenance,
        "core#usage.synthesizedEmpty",
    );
    // the seven metered docs state ONE of two estimate texts (one page /
    // one record) — interned to two fnTable entries
    const estimates = new Set(
        ids.filter((id) => id !== "apollo#mixed_people/api_search").map((
            id,
        ) => bundle.endpoints[id].usage.estimate.$fn.key),
    );
    assertEquals(estimates.size, 2);
    // evidence is per endpoint: the two `organization` lookups share one
    // text, everything else counts its own collection (design D5)
    assertEquals(
        bundle.endpoints["apollo#organizations/enrich"].usage.evidence.$fn.key,
        bundle.endpoints["apollo#organizations/show"].usage.evidence.$fn.key,
    );
    const evidence = new Set(
        ids.filter((id) => id !== "apollo#mixed_people/api_search").map((
            id,
        ) => bundle.endpoints[id].usage.evidence.$fn.key),
    );
    assertEquals(evidence.size, 6);
});
