import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    type Fixture,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { DATAFORSEO_KEYS } from "./schema/auth.ts";

/**
 * THE dataforseo suite (design D10, the surf D2 layout): 216 docs of four
 * billing shapes on ONE envelope — flat per call, a page price per block
 * of N results, a request fee plus a per-row price, and free — settled by
 * ONE provider-level evidence and ONE consolidate (the vendor's `cost`),
 * so the tests live once here and iterate the catalog, while every
 * endpoint keeps its OWN fixtures under `endpoints/<family>/<leaf>/
 * fixtures/` (replay matches on the exact wire URL; `deno task record`
 * writes there too). The shared shapes — empties, the in-band verdicts,
 * the queued-task chain, the dictionary filter — ride representatives.
 *
 * The vendor's receipt WINS at settle (design D4), so a happy run's
 * `usage.credits` is the fixture's `cost`; the derived fold must agree to
 * 1e-9 or a `mismatch` key appears — zUsage is strict, so the deep
 * equality below proves the model, the evidence, and the receipt are one
 * story. The rate table is LITERAL on purpose (clay D7a): deriving it
 * from each doc's model would make this a tautology.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;

const inputFor = (id: string): RunInput => {
    const input = INPUTS[id.split("#")[1]];
    assert(input !== undefined, `${id}: no test input in test-inputs.json`);
    return input;
};

/** Fixture dir: `endpoints/<family>/<id path, slashes as dashes>/fixtures/`
 *  (design D1). The family folder is organisational (v1's API family),
 *  not part of the id, so it is looked up once from the tree. */
const FAMILY_OF = new Map<string, string>();
for await (const family of Deno.readDir(`${HERE}endpoints`)) {
    if (!family.isDirectory) continue;
    for await (const leaf of Deno.readDir(`${HERE}endpoints/${family.name}`)) {
        if (leaf.isDirectory) FAMILY_OF.set(leaf.name, family.name);
    }
}
const fixtureFor = (id: string, name: string): Promise<Fixture> => {
    const leaf = id.split("#")[1].replaceAll("/", "-");
    const family = FAMILY_OF.get(leaf);
    assert(family !== undefined, `${id}: no endpoint folder for ${leaf}`);
    return loadFixture(
        `${HERE}endpoints/${family}/${leaf}/fixtures/${name}.json`,
    );
};

const dataforseoIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("dataforseo#"))
        .sort();
};

const PARAMS = { login: "test-login", password: "test-password" };

/** Validate-only run: the estimate derives the input without IO, so a
 *  rejecting transport proves whether an input passes the compiled gate. */
const validates = async (id: string, input: RunInput) => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return await loaded.estimate(input);
};
const rejects = (id: string, input: RunInput) =>
    assertRejects(() => validates(id, input), Error, "INVALID_INPUT");

/** One engine run against a stub that records what went on the wire. */
const wire = async (id: string, input: RunInput, body: Json) => {
    const seen: { url: string; headers: Headers; body: unknown }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: (target, init) => {
                const url = target instanceof Request
                    ? target.url
                    : String(target);
                seen.push({
                    url,
                    headers: new Headers(init?.headers),
                    body: init?.body
                        ? JSON.parse(String(init.body))
                        : undefined,
                });
                return Promise.resolve(
                    new Response(JSON.stringify(body), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    await loaded.run(input);
    return seen;
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

type Prop = { description?: string; default?: Json };
/** A compiled input part's fields: its own `properties`, or those of its
 *  `anyOf` arms merged (an "at least one of" body is a union of
 *  `.required` arms over the same fields). */
const propsOf = (part: unknown): Record<string, Prop> => {
    const p = part as
        | { properties?: Record<string, Prop>; anyOf?: unknown[] }
        | undefined;
    if (p?.properties !== undefined) return p.properties;
    return Object.assign({}, ...(p?.anyOf ?? []).map(propsOf));
};

/**
 * The account's price list (`GET /v3/appendix/user_data` `price`,
 * 2026-09-18, confirmed by receipts the same day — v1 `mod.test.ts`),
 * one literal card per endpoint:
 *   - `flat <usd>`            one price per call
 *   - `page <usd>/<n>`        one price per page of n results (`every`)
 *   - `rows <fee>+<usd>`      a request fee plus a per-row price
 *   - `row <usd>`             a per-row price with no request fee
 *   - `free`                  a dictionary lookup
 * A new endpoint must state its row here.
 */
const RATE: Record<string, string> = {
    "dataforseo#ai/chatgpt-response": "flat 0.0006",
    "dataforseo#backlinks/anchors": "rows 0.024+0.000036",
    "dataforseo#backlinks/backlinks": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-backlinks": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-new-lost-backlinks": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-new-lost-referring-domains":
        "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-pages-summary": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-ranks": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-referring-domains": "rows 0.024+0.000036",
    "dataforseo#backlinks/bulk-spam-score": "rows 0.024+0.000036",
    "dataforseo#backlinks/competitors": "rows 0.024+0.000036",
    "dataforseo#backlinks/domain-intersection": "rows 0.024+0.000036",
    "dataforseo#backlinks/domain-pages": "rows 0.024+0.000036",
    "dataforseo#backlinks/domain-pages-summary": "rows 0.024+0.000036",
    "dataforseo#backlinks/filters": "free",
    "dataforseo#backlinks/history": "rows 0.024+0.000036",
    "dataforseo#backlinks/index": "free",
    "dataforseo#backlinks/page-intersection": "rows 0.024+0.000036",
    "dataforseo#backlinks/referring-domains": "rows 0.024+0.000036",
    "dataforseo#backlinks/referring-networks": "rows 0.024+0.000036",
    "dataforseo#backlinks/summary": "rows 0.024+0.000036",
    "dataforseo#backlinks/timeseries-new-lost": "rows 0.024+0.000036",
    "dataforseo#backlinks/timeseries-summary": "rows 0.024+0.000036",
    "dataforseo#keywords/bing-audience-estimation": "flat 0.09",
    "dataforseo#keywords/bing-industries": "free",
    "dataforseo#keywords/bing-job-functions": "free",
    "dataforseo#keywords/bing-keyword-performance": "flat 0.09",
    "dataforseo#keywords/bing-keyword-performance-locations": "free",
    "dataforseo#keywords/bing-keywords-for-keywords": "flat 0.09",
    "dataforseo#keywords/bing-keywords-for-site": "flat 0.09",
    "dataforseo#keywords/bing-search-volume": "flat 0.09",
    "dataforseo#keywords/bing-search-volume-history": "flat 0.09",
    "dataforseo#keywords/bing-search-volume-history-locations": "free",
    "dataforseo#keywords/clickstream-bulk-search-volume": "rows 0.012+0.00012",
    "dataforseo#keywords/clickstream-global-search-volume": "flat 0.18",
    "dataforseo#keywords/clickstream-locations": "free",
    "dataforseo#keywords/clickstream-search-volume": "flat 0.18",
    "dataforseo#keywords/google-ads-ad-traffic": "flat 0.09",
    "dataforseo#keywords/google-ads-keywords-for-keywords": "flat 0.09",
    "dataforseo#keywords/google-ads-keywords-for-site": "flat 0.09",
    "dataforseo#keywords/google-ads-locations": "free",
    "dataforseo#keywords/google-ads-search-volume": "flat 0.09",
    "dataforseo#keywords/google-trends-categories": "free",
    "dataforseo#keywords/google-trends-explore": "flat 0.011",
    "dataforseo#keywords/google-trends-locations": "free",
    "dataforseo#keywords/trends-demography": "flat 0.0024",
    "dataforseo#keywords/trends-explore": "flat 0.0012",
    "dataforseo#keywords/trends-locations": "free",
    "dataforseo#keywords/trends-merged": "flat 0.006",
    "dataforseo#keywords/trends-subregions": "flat 0.0024",
    "dataforseo#labs/amazon-bulk-search-volume": "rows 0.012+0.00012",
    "dataforseo#labs/amazon-product-competitors": "rows 0.012+0.00012",
    "dataforseo#labs/amazon-product-keyword-intersections":
        "rows 0.012+0.00012",
    "dataforseo#labs/amazon-product-rank-overview": "rows 0.012+0.00012",
    "dataforseo#labs/amazon-ranked-keywords": "rows 0.012+0.00012",
    "dataforseo#labs/amazon-related-keywords": "rows 0.012+0.00012",
    "dataforseo#labs/app-store-app-competitors": "rows 0.012+0.00012",
    "dataforseo#labs/app-store-app-intersection": "rows 0.012+0.00012",
    "dataforseo#labs/app-store-bulk-app-metrics": "rows 0.012+0.00012",
    "dataforseo#labs/app-store-keywords-for-app": "rows 0.012+0.00012",
    "dataforseo#labs/available-history": "free",
    "dataforseo#labs/bulk-keyword-difficulty": "rows 0.012+0.00012",
    "dataforseo#labs/bulk-traffic-estimation": "rows 0.012+0.00012",
    "dataforseo#labs/categories": "free",
    "dataforseo#labs/categories-for-domain": "rows 0.012+0.00012",
    "dataforseo#labs/categories-for-keywords": "rows 0.012+0.00012",
    "dataforseo#labs/competitors-domain": "rows 0.012+0.00012",
    "dataforseo#labs/domain-intersection": "rows 0.012+0.00012",
    "dataforseo#labs/domain-metrics-by-categories": "rows 0.12+0.0012",
    "dataforseo#labs/domain-rank-overview": "rows 0.012+0.00012",
    "dataforseo#labs/filters": "free",
    "dataforseo#labs/google-play-app-competitors": "rows 0.012+0.00012",
    "dataforseo#labs/google-play-app-intersection": "rows 0.012+0.00012",
    "dataforseo#labs/google-play-bulk-app-metrics": "rows 0.012+0.00012",
    "dataforseo#labs/google-play-keywords-for-app": "rows 0.012+0.00012",
    "dataforseo#labs/historical-bulk-traffic-estimation": "rows 0.12+0.0012",
    "dataforseo#labs/historical-keyword-data": "rows 0.012+0.00012",
    "dataforseo#labs/historical-rank-overview": "rows 0.12+0.0012",
    "dataforseo#labs/historical-serps": "row 0.00012",
    "dataforseo#labs/keyword-ideas": "rows 0.012+0.00012",
    "dataforseo#labs/keyword-overview": "rows 0.012+0.00012",
    "dataforseo#labs/keyword-suggestions": "rows 0.012+0.00012",
    "dataforseo#labs/keywords-for-categories": "rows 0.012+0.00012",
    "dataforseo#labs/keywords-for-site": "rows 0.012+0.00012",
    "dataforseo#labs/locations": "free",
    "dataforseo#labs/page-intersection": "rows 0.012+0.00012",
    "dataforseo#labs/ranked-keywords": "rows 0.012+0.00012",
    "dataforseo#labs/related-keywords": "rows 0.012+0.00012",
    "dataforseo#labs/relevant-pages": "rows 0.012+0.00012",
    "dataforseo#labs/search-intent": "rows 0.012+0.00012",
    "dataforseo#labs/serp-competitors": "rows 0.012+0.00012",
    "dataforseo#labs/subdomains": "rows 0.012+0.00012",
    "dataforseo#labs/top-searches": "rows 0.012+0.00012",
    "dataforseo#onpage/content-parsing": "flat 0.00015",
    "dataforseo#onpage/filters": "free",
    "dataforseo#onpage/instant-pages": "flat 0.00015",
    "dataforseo#onpage/lighthouse": "flat 0.005",
    "dataforseo#onpage/lighthouse-audits": "free",
    "dataforseo#onpage/lighthouse-versions": "free",
    // vendor pricing page (dataforseo.com/pricing/on-page, 2026-09-25)
    "dataforseo#onpage/page-screenshot": "flat 0.0048",
    "dataforseo#serp/baidu-locations": "free",
    "dataforseo#serp/baidu-organic": "page 0.0012/10",
    "dataforseo#serp/bing-locations": "free",
    "dataforseo#serp/bing-organic": "page 0.002/10",
    "dataforseo#serp/google-ads-advertisers": "flat 0.0012",
    "dataforseo#serp/google-ads-search": "page 0.0012/40",
    "dataforseo#serp/google-ai-mode": "flat 0.004",
    "dataforseo#serp/google-autocomplete": "flat 0.002",
    "dataforseo#serp/google-dataset-info": "flat 0.002",
    "dataforseo#serp/google-dataset-search": "page 0.002/20",
    "dataforseo#serp/google-finance-explore": "flat 0.002",
    "dataforseo#serp/google-finance-markets": "flat 0.002",
    "dataforseo#serp/google-finance-quote": "flat 0.002",
    "dataforseo#serp/google-finance-ticker-search": "flat 0.002",
    "dataforseo#serp/google-images": "page 0.002/100",
    "dataforseo#serp/google-jobs": "page 0.0012/10",
    "dataforseo#serp/google-local-finder": "page 0.002/20",
    "dataforseo#serp/google-locations": "free",
    "dataforseo#serp/google-maps": "page 0.002/100",
    "dataforseo#serp/google-news": "page 0.002/100",
    "dataforseo#serp/google-organic": "page 0.002/10",
    "dataforseo#serp/google-search-by-image": "page 0.0012/100",
    "dataforseo#serp/naver-organic": "page 0.0012/15",
    "dataforseo#serp/seznam-locations": "free",
    "dataforseo#serp/seznam-organic": "page 0.0012/10",
    "dataforseo#serp/yahoo-locations": "free",
    "dataforseo#serp/yahoo-organic": "page 0.002/10",
    "dataforseo#serp/youtube-comments": "page 0.002/20",
    "dataforseo#serp/youtube-locations": "free",
    "dataforseo#serp/youtube-organic": "page 0.002/20",
    "dataforseo#serp/youtube-subtitles": "flat 0.002",
    "dataforseo#serp/youtube-video-info": "flat 0.002",
};

type Card =
    | { kind: "free" }
    | { kind: "flat"; amount: number }
    | { kind: "page"; amount: number; every: number }
    | { kind: "rows"; fee: number; row: number }
    | { kind: "row"; row: number };
const card = (id: string): Card => {
    const [kind, spec] = RATE[id].split(" ");
    if (kind === "free") return { kind };
    if (kind === "flat") return { kind, amount: Number(spec) };
    if (kind === "page") {
        const [amount, every] = spec.split("/");
        return { kind, amount: Number(amount), every: Number(every) };
    }
    if (kind === "rows") {
        const [fee, row] = spec.split("+");
        return { kind, fee: Number(fee), row: Number(row) };
    }
    return { kind: "row", row: Number(spec) };
};

/** What a happy fixture settles to: the receipt (claim wins) and the
 *  derived quantity, which must agree with it. The fixtures carry 3 rows
 *  on per-row products and one page on page-billed ones. */
const happyUsage = (
    id: string,
): { credits: Record<string, number>; evidence: Record<string, number> } => {
    const c = card(id);
    switch (c.kind) {
        case "free":
            return { credits: {}, evidence: {} };
        case "flat":
            // the engine appends the flat line's own count
            return { credits: { default: c.amount }, evidence: { CALL: 1 } };
        case "page":
            return {
                credits: { default: c.amount },
                evidence: { RESULT: c.every },
            };
        case "rows":
            // the engine appends the flat component's own count
            return {
                credits: { default: round6(c.fee + 3 * c.row) },
                evidence: { base_fee: 1, rows: 3 },
            };
        case "row":
            return {
                credits: { default: round6(3 * c.row) },
                evidence: { RESULT: 3 },
            };
    }
};

const LLM_RESPONSES = [
    "dataforseo#ai/chatgpt-response",
    "dataforseo#ai/claude-response",
    "dataforseo#ai/gemini-response",
    "dataforseo#ai/perplexity-response",
];

// ---------------------------------------------------------------------------
// the catalog
// ---------------------------------------------------------------------------

Deno.test("dataforseo docs: every endpoint is in the rate table", async () => {
    const ids = await dataforseoIds();
    assertEquals(ids.length, 132);
    assertEquals(Object.keys(RATE).sort(), ids);
});

/** A page card's rate-line text names the count field the doc takes. */
const pageText = (fields: Record<string, unknown>, every: number): string => {
    if ("block_depth" in fields) {
        return `results asked for (block_depth), billed per page of ${every}`;
    }
    if (!("depth" in fields)) {
        return `pages asked for (max_crawl_pages), ${every} results each`;
    }
    return "max_crawl_pages" in fields
        ? `results asked for (depth, or max_crawl_pages pages), billed per page of ${every}`
        : `results asked for (depth), billed per page of ${every}`;
};

Deno.test("dataforseo docs: the card in the rate table is the doc's model", async () => {
    const bundle = await testBundle();
    for (const id of await dataforseoIds()) {
        const model = bundle.endpoints[id].usage.model;
        const c = card(id);
        switch (c.kind) {
            case "free":
                assertEquals(model, { kind: "FREE" }, id);
                break;
            case "flat":
                assertEquals(model, {
                    kind: "PER_CALL",
                    consumes: { credit: "default", amount: c.amount },
                }, id);
                break;
            case "page":
                assertEquals(model, {
                    kind: "PER_UNIT",
                    unit: "RESULT",
                    every: c.every,
                    consumes: { credit: "default", amount: c.amount },
                    label: "results requested",
                    description: pageText(
                        propsOf(bundle.endpoints[id].input.schema.body),
                        c.every,
                    ),
                }, id);
                break;
            case "rows":
                assertEquals(model, {
                    kind: "COMPOSITE",
                    components: {
                        base_fee: {
                            kind: "PER_CALL",
                            consumes: { credit: "default", amount: c.fee },
                            label: "base fee",
                            description: "the per-request fee",
                        },
                        rows: {
                            kind: "PER_UNIT",
                            unit: "RESULT",
                            every: 1,
                            consumes: { credit: "default", amount: c.row },
                            label: "rows",
                            description:
                                "items returned (result[0].items, or " +
                                "its items_count when the items were not " +
                                "returned)",
                        },
                    },
                }, id);
                break;
            case "row":
                assertEquals(model, {
                    kind: "PER_UNIT",
                    unit: "RESULT",
                    every: 1,
                    consumes: { credit: "default", amount: c.row },
                    label: "rows",
                    description: "items returned (result[0].items, or " +
                        "its items_count when the items were not returned)",
                }, id);
                break;
        }
    }
});

Deno.test("dataforseo docs: one Basic inject, one relay, one digest, one meter, one evidence; the four override starts and two polls", async () => {
    const bundle = await testBundle();
    const ids = await dataforseoIds();
    const first = bundle.endpoints[ids[0]];
    const provenanceOf = (key: string) => bundle.fnTable[key].provenance;
    const starts = new Map<string, string[]>();
    const polls = new Set<string>();
    const estimates = new Set<string>();
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        const c = card(id);
        // the provider-wide hooks
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assert(
            provenanceOf(doc.auth.inject.$fn.key).startsWith(
                "connectors/dataforseo/provider.ts",
            ),
            id,
        );
        assertEquals(doc.auth.credentials.required, ["login", "password"], id);
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            first.output.fromResponse?.$fn.key,
            id,
        );
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        assert(doc.usage.consolidate, `${id}: the receipt must be read`);
        assertEquals(
            doc.usage.evidence.$fn.key,
            first.usage.evidence.$fn.key,
            id,
        );
        // the LLM cap rides toRequest on the four response docs only
        assertEquals(
            doc.input.toRequest !== undefined,
            LLM_RESPONSES.includes(id),
            id,
        );
        // pool: dollars on every priced doc, none on a free one
        assertEquals(
            doc.usage.credits,
            c.kind === "free" ? {} : { default: { label: "US dollars" } },
            id,
        );
        // the estimate is the endpoint's own on metered docs
        if (c.kind === "page" || c.kind === "rows" || c.kind === "row") {
            // authored, never the compiler's empty synthesis (identical
            // texts intern across providers — the fixed one-row promise
            // is apollo's text too)
            assert(
                !provenanceOf(doc.usage.estimate.$fn.key).startsWith("core#"),
                id,
            );
            estimates.add(doc.usage.estimate.$fn.key);
        }
        // every doc runs through a start; which one says the shape
        assert(doc.lifecycle?.start, `${id}: no start`);
        const startKey = doc.lifecycle.start.$fn.key;
        starts.set(startKey, [...(starts.get(startKey) ?? []), id]);
        if (doc.lifecycle.poll) polls.add(doc.lifecycle.poll.$fn.key);
        const queued = doc.request.url.endsWith("/task_post");
        assertEquals(doc.lifecycle.poll !== undefined, queued, id);
        assertEquals(doc.lifecycle.stateSchema !== undefined, queued, id);
        assertEquals(
            doc.timeouts,
            queued
                ? { requestMs: 130_000, runMs: 1_800_000, pollMs: 10_000 }
                : id === "dataforseo#ai/chatgpt-search" ||
                        id === "dataforseo#ai/gemini-search"
                ? { requestMs: 100_000, runMs: 100_000 }
                : { requestMs: 130_000, runMs: 130_000 },
            id,
        );
        // ids are v1's short names (design D1); the wire is the vendor's
        assert(
            doc.request.url.startsWith("https://api.dataforseo.com/v3/"),
            id,
        );
        assertEquals(id.split("#")[1].split("/").length, 2, id);
        assert(
            doc.meta.docsUrl?.startsWith("https://docs.dataforseo.com/v3/"),
            id,
        );
        assertEquals(
            doc.request.method,
            c.kind === "free"
                ? "GET"
                : (id === "dataforseo#google-shopping/seller-ad-url"
                    ? "GET"
                    : "POST"),
            id,
        );
    }
    // five start texts: the provider's live relay (POST products), the
    // queued task_post, the filtering dictionary, the app category lookup
    // (names inside one row), the plain GET relay
    assertEquals(starts.size, 4);
    const byProvenance = [...starts.entries()].map(([key, docs]) =>
        [
            provenanceOf(key).startsWith("connectors/dataforseo/provider.ts"),
            docs.length,
        ] as const
    );
    assertEquals(
        byProvenance.filter(([mine]) => mine).map(([, n]) => n),
        [101],
    );
    assertEquals(
        byProvenance.filter(([mine]) => !mine).map(([, n]) => n).sort((a, b) =>
            a - b
        ),
        [6, 7, 18],
    );
    // two poll texts: task_get/advanced/{id} and task_get/{id}
    assertEquals(polls.size, 1);
    // the estimate texts: depth, YouTube's block_depth, depth × crawl pages
    // (per page size), crawl pages only, limit, one per array field, and the
    // fixed one row
    assertEquals(estimates.size, 20);
});

Deno.test("dataforseo meta: the provider's envelope and blocked-field notes reach every doc; v1's pricing notes ride the docs that had them", async () => {
    const bundle = await testBundle();
    for (const id of await dataforseoIds()) {
        const notes = (bundle.endpoints[id].meta.notes ?? []).join(" ");
        assert(notes.includes("returns `tasks[0].result`"), id);
        assert(notes.includes("40100 → 401"), id);
        assert(notes.includes("`postback_url`"), id);
    }
    const notesOf = (id: string) =>
        (bundle.endpoints[id].meta.notes ?? []).join(" ");
    assert(
        notesOf("dataforseo#serp/google-organic").includes(
            "Billed per page of 10",
        ),
    );
    assert(notesOf("dataforseo#ai/chatgpt-response").includes("token cost"));
    // v1's hints became description prose naming the dictionary
    assert(
        (bundle.endpoints["dataforseo#serp/google-organic"].meta.description ??
            "").includes("call dataforseo#serp/google-locations"),
    );
});

Deno.test("dataforseo schemas: strict mirrors, the vendor's default on limit / depth and nowhere else, the dictionary query", async () => {
    const bundle = await testBundle();
    type Obj = {
        additionalProperties: boolean;
        required?: string[];
        properties: Record<string, { description?: string; default?: Json }>;
    };
    const organic = bundle.endpoints["dataforseo#serp/google-organic"].input
        .schema.body as Obj;
    assertEquals(organic.additionalProperties, false);
    assertEquals(organic.required, ["keyword"]);
    assertEquals(organic.properties.depth.default, 10);
    for (const blocked of ["postback_url", "pingback_url", "tag", "priority"]) {
        assertEquals(blocked in organic.properties, false, blocked);
    }
    const ranked = bundle.endpoints["dataforseo#labs/ranked-keywords"].input
        .schema.body as Obj;
    assertEquals(ranked.required, ["target"]);
    assertEquals(ranked.properties.limit.default, 100);
    assert(ranked.properties.limit.description?.startsWith("Rows to return"));
    // the vendor's default rides limit / depth on the metered docs (v1's
    // posture, owner 2026-09-21) and no other field anywhere
    const defaults: string[] = [];
    for (const id of await dataforseoIds()) {
        const schema = bundle.endpoints[id].input.schema;
        for (const part of Object.values(schema) as Obj[]) {
            for (const [name, prop] of Object.entries(propsOf(part))) {
                assert(prop.description, `${id} ${name}: describe survived`);
                if (prop.default !== undefined) {
                    assert(
                        name === "limit" || name === "depth" ||
                            name === "block_depth",
                        `${id} ${name}`,
                    );
                    defaults.push(name);
                }
            }
        }
    }
    assertEquals(defaults.filter((n) => n === "limit").length, 35);
    assertEquals(defaults.filter((n) => n === "depth").length, 14);
    assertEquals(defaults.filter((n) => n === "block_depth").length, 1);
    // the dictionary query is ours: search and limit optional, country in
    // the path for the per-country lists
    const locations = bundle.endpoints["dataforseo#serp/google-locations"]
        .input.schema;
    assertEquals((locations.queryParams as Obj).required, undefined);
    assertEquals((locations.pathParams as Obj).required, ["country"]);
    // a catalogue takes nothing: an empty strict object
    const filters = bundle.endpoints["dataforseo#labs/filters"].input.schema;
    assertEquals(Object.keys(filters), ["queryParams"]);
    assertEquals((filters.queryParams as Obj).additionalProperties, false);
    assertEquals((filters.queryParams as Obj).properties, {});
});

// ---------------------------------------------------------------------------
// the 216 relays
// ---------------------------------------------------------------------------

/**
 * What each lookup's happy run keeps, pinned by position (not re-derived
 * from the filter): location lists search 'city' and keep the three City
 * rows at 1, 2, 5; the other row lookups interleave their four matches
 * with two misses and keep 1, 3, 4 (limit 3 cuts the fourth); the two app
 * category lookups keep three names inside their single row.
 */
const keptRows = (id: string, rows: unknown[]): unknown[] => {
    if (id === "dataforseo#app-store/categories") {
        return [{ categories: ["Games", "Games: Puzzle", "Games: Strategy"] }];
    }
    if (id === "dataforseo#google-play/categories") {
        return [{ categories: ["Game", "Game: Puzzle", "Game: Strategy"] }];
    }
    const at = id.includes("locations") ? [1, 2, 5] : [1, 3, 4];
    return at.map((i) => rows[i]);
};

Deno.test("dataforseo: every endpoint's happy run settles at the receipt, the fold agrees, and the caller gets tasks[0].result", async () => {
    for (const id of await dataforseoIds()) {
        const fixture = await fixtureFor(id, "synthetic-happy");
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, happyUsage(id), id);
        const last = fixture.calls[fixture.calls.length - 1].res.body as {
            tasks: { result: unknown[] }[];
        };
        assert(Array.isArray(result.output), id);
        if (inputFor(id).queryParams?.search !== undefined) {
            const rows = last.tasks[0].result;
            assertEquals(result.output, keptRows(id, rows), id);
        } else {
            assertEquals(result.output, last.tasks[0].result, id);
        }
    }
});

Deno.test("dataforseo: the wire — one-task array over Basic auth, priority 2 on task_post, the LLM cap under the caller's fields", async () => {
    const ok = {
        status_code: 20000,
        cost: 0,
        tasks: [{ status_code: 20000, cost: 0, result: [] }],
    };
    const organic = await wire(
        "dataforseo#serp/google-organic",
        { body: { keyword: "seo api", depth: 30 } },
        ok,
    );
    assertEquals(organic.length, 1);
    assertEquals(
        organic[0].url,
        "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    );
    assertEquals(organic[0].body, [{ keyword: "seo api", depth: 30 }]);
    assertEquals(
        organic[0].headers.get("authorization"),
        "Basic " + btoa("test-login:test-password"),
    );
    const jobs = await wire(
        "dataforseo#serp/google-jobs",
        { body: { keyword: "seo api", depth: 10 } },
        // 20000 without a task id → the start settles 502; the post is
        // what this pins
        ok,
    );
    assertEquals(jobs[0].body, [{
        keyword: "seo api",
        depth: 10,
        priority: 2,
    }]);
    const capped = await wire(
        "dataforseo#ai/chatgpt-response",
        { body: { user_prompt: "hi", model_name: "gpt-4o-mini" } },
        ok,
    );
    assertEquals(capped[0].body, [{
        max_output_tokens: 1024,
        user_prompt: "hi",
        model_name: "gpt-4o-mini",
    }]);
    const smaller = await wire(
        "dataforseo#ai/chatgpt-response",
        {
            body: {
                user_prompt: "hi",
                model_name: "gpt-4o-mini",
                max_output_tokens: 256,
            },
        },
        ok,
    );
    assertEquals(
        (smaller[0].body as { max_output_tokens: number }[])[0]
            .max_output_tokens,
        256,
    );
    // the dictionary sends no query (search / limit are ours) and the
    // country rides the path
    const locations = await wire(
        "dataforseo#serp/google-locations",
        {
            pathParams: { country: "gb" },
            queryParams: { search: "lon", limit: 5 },
        },
        ok,
    );
    assertEquals(
        locations[0].url,
        "https://api.dataforseo.com/v3/serp/google/locations/gb",
    );
    assertEquals(locations[0].body, undefined);
});

Deno.test("dataforseo: the Basic header encodes non-ASCII credentials as UTF-8", async () => {
    const engine = new Engine({
        transport: directTransport({
            params: () =>
                Promise.resolve({
                    login: "zoë@example.com",
                    password: "pässwörd✓",
                }),
            fetch: (target, init) => {
                const auth = new Headers(init?.headers).get("authorization");
                const expected = "Basic " + btoa(
                    String.fromCharCode(
                        ...new TextEncoder().encode(
                            "zoë@example.com:pässwörd✓",
                        ),
                    ),
                );
                assertEquals(auth, expected, String(target));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            status_code: 20000,
                            cost: 0,
                            tasks: [{
                                status_code: 20000,
                                cost: 0,
                                result: [],
                            }],
                        }),
                        {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const loaded = await engine.load(
        await testSealedUnit("dataforseo#labs/filters"),
    );
    const result = await loaded.run({});
    assertEquals(result.isProviderError, false);
});

Deno.test("dataforseo: an empty success still pays the page or the request fee; a dictionary miss is free", async () => {
    const organic = "dataforseo#serp/google-organic";
    const page = await runEndpoint({
        unit: await testSealedUnit(organic),
        input: inputFor(organic),
        mode: "replay",
        fixture: await fixtureFor(organic, "synthetic-empty"),
    });
    assertEquals(page.httpStatus, 200);
    assertEquals(page.usage, {
        credits: { default: 0.002 },
        evidence: { RESULT: 10 },
    });
    assertEquals(page.output, [{ total_count: 0, items_count: 0, items: [] }]);
    const ranked = "dataforseo#labs/ranked-keywords";
    const rows = await runEndpoint({
        unit: await testSealedUnit(ranked),
        input: inputFor(ranked),
        mode: "replay",
        fixture: await fixtureFor(ranked, "synthetic-empty"),
    });
    assertEquals(rows.usage, {
        credits: { default: 0.012 },
        evidence: { base_fee: 1, rows: 0 },
    });
    const locations = "dataforseo#serp/google-locations";
    const miss = await runEndpoint({
        unit: await testSealedUnit(locations),
        input: {
            pathParams: { country: "us" },
            queryParams: { search: "zzz", limit: 3 },
        },
        mode: "replay",
        fixture: await fixtureFor(locations, "synthetic-empty"),
    });
    assertEquals(miss.httpStatus, 200);
    assertEquals(miss.usage, { credits: {}, evidence: {} });
    assertEquals(miss.output, []);
    // no search, no limit: the whole list (v1), inline
    const whole = await runEndpoint({
        unit: await testSealedUnit(locations),
        input: { pathParams: { country: "us" } },
        mode: "replay",
        fixture: await fixtureFor(locations, "synthetic-empty"),
    });
    assertEquals((whole.output as unknown[]).length, 6);
});

Deno.test("dataforseo: a GET lookup answering 40106 (partial results) is a success like 20000", async () => {
    const bundle = await testBundle();
    let seen = 0;
    for (const id of await dataforseoIds()) {
        if (bundle.endpoints[id].input.schema.body !== undefined) continue;
        seen++;
        const fixture = structuredClone(
            await fixtureFor(id, "synthetic-happy"),
        );
        const body = fixture.calls[0].res.body as {
            tasks: { status_code: number }[];
        };
        body.tasks[0].status_code = 40106;
        const run = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(run.httpStatus, 200, id);
        assertEquals(run.isProviderError, false, id);
    }
    assert(seen > 0);
});

Deno.test("dataforseo: items_count stands in when items are not returned; 40106 partial results relay as success", async () => {
    const ranked = "dataforseo#labs/ranked-keywords";
    const counted = await runEndpoint({
        unit: await testSealedUnit(ranked),
        input: inputFor(ranked),
        mode: "replay",
        fixture: await fixtureFor(ranked, "synthetic-items-count"),
    });
    assertEquals(counted.usage, {
        credits: { default: 0.0126 },
        evidence: { base_fee: 1, rows: 5 },
    });
    const organic = "dataforseo#serp/google-organic";
    const partial = await runEndpoint({
        unit: await testSealedUnit(organic),
        input: inputFor(organic),
        mode: "replay",
        fixture: await fixtureFor(organic, "synthetic-partial"),
    });
    assertEquals(partial.httpStatus, 200);
    assertEquals(partial.isProviderError, false);
    assertEquals(partial.usage, {
        credits: { default: 0.002 },
        evidence: { RESULT: 10 },
    });
});

Deno.test("dataforseo: in-band verdicts are data — 40501 → 400, a top-level 50304 with tasks: null → 502, a real 401 → 401; all zero usage", async () => {
    const organic = "dataforseo#serp/google-organic";
    const invalid = await runEndpoint({
        unit: await testSealedUnit(organic),
        input: inputFor(organic),
        mode: "replay",
        fixture: await fixtureFor(organic, "synthetic-invalid-field"),
    });
    assertEquals(invalid.httpStatus, 400);
    assertEquals(invalid.isProviderError, true);
    assertEquals(invalid.usage, { credits: {}, evidence: {} });
    assertEquals(
        (invalid.output as { message: string; status_code: number }).message,
        "Invalid Field: 'depth'.",
    );
    assertEquals(
        (invalid.output as { status_code: number }).status_code,
        40501,
    );
    const ranked = "dataforseo#labs/ranked-keywords";
    const down = await runEndpoint({
        unit: await testSealedUnit(ranked),
        input: inputFor(ranked),
        mode: "replay",
        fixture: await fixtureFor(ranked, "synthetic-unavailable"),
    });
    assertEquals(down.httpStatus, 502);
    assertEquals(down.isProviderError, true);
    assertEquals(down.usage, { credits: {}, evidence: {} });
    assertEquals(
        (down.output as { message: string }).message,
        "This function temporarily unavailable.",
    );
    assertEquals((down.output as { status_code: number }).status_code, 50304);
    const unauthorized = await runEndpoint({
        unit: await testSealedUnit(organic),
        input: inputFor(organic),
        mode: "replay",
        fixture: await fixtureFor(organic, "synthetic-unauthorized"),
    });
    assertEquals(unauthorized.httpStatus, 401);
    assertEquals(unauthorized.isProviderError, true);
    assertEquals(unauthorized.usage, { credits: {}, evidence: {} });
    assert(
        (unauthorized.output as { message: string }).message.startsWith(
            "You are not authorized",
        ),
    );
    assertEquals(
        (unauthorized.output as { raw: { tasks: null } }).raw.tasks,
        null,
    );
});

Deno.test("dataforseo: the queued chain — a throttled read and an upstream 503 keep polling; a terminal failure and a missing task id are data", async () => {
    const jobs = "dataforseo#serp/google-jobs";
    const throttled = await runEndpoint({
        unit: await testSealedUnit(jobs),
        input: inputFor(jobs),
        mode: "replay",
        fixture: await fixtureFor(jobs, "synthetic-task-throttled"),
    });
    assertEquals(throttled.httpStatus, 200);
    assertEquals(throttled.usage, {
        credits: { default: 0.0012 },
        evidence: { RESULT: 10 },
    });
    assertEquals((throttled.output as unknown[]).length, 1);
    const failed = await runEndpoint({
        unit: await testSealedUnit(jobs),
        input: inputFor(jobs),
        mode: "replay",
        fixture: await fixtureFor(jobs, "synthetic-task-failed"),
    });
    assertEquals(failed.httpStatus, 502);
    assertEquals(failed.isProviderError, true);
    assertEquals(failed.usage, { credits: {}, evidence: {} });
    assertEquals(
        (failed.output as { message: string }).message,
        "Internal Error.",
    );
    const noId = await runEndpoint({
        unit: await testSealedUnit(jobs),
        input: inputFor(jobs),
        mode: "replay",
        fixture: await fixtureFor(jobs, "synthetic-task-no-id"),
    });
    assertEquals(noId.httpStatus, 502);
    assertEquals(noId.isProviderError, true);
    assertEquals(noId.usage, { credits: {}, evidence: {} });
});

// ---------------------------------------------------------------------------
// the gates
// ---------------------------------------------------------------------------

Deno.test("dataforseo: every input schema is strict — an unknown key or a callback field never reaches the wire", async () => {
    for (const id of await dataforseoIds()) {
        const input = inputFor(id);
        const part = input.body !== undefined
            ? "body"
            : input.queryParams !== undefined
            ? "queryParams"
            : input.pathParams !== undefined
            ? "pathParams"
            : undefined;
        if (part === undefined) {
            // a catalogue takes no input at all
            await validates(id, {});
            await rejects(id, { queryParams: { limit: 3 } });
            continue;
        }
        await rejects(id, {
            ...input,
            [part]: {
                ...(input[part] as Record<string, Json>),
                not_a_field: 1,
            },
        });
        if (part === "body") {
            await rejects(id, {
                ...input,
                body: {
                    ...(input.body as Record<string, Json>),
                    postback_url: "https://example.com/hook",
                },
            });
        }
        await validates(id, input);
    }
});

Deno.test("dataforseo floors: max_crawl_pages and block_depth take at least 1 — a 0 or negative page count never reaches the estimate", async () => {
    const bundle = await testBundle();
    let seen = 0;
    for (const id of await dataforseoIds()) {
        const body = bundle.endpoints[id].input.schema.body;
        if (propsOf(body).max_crawl_pages === undefined) continue;
        seen++;
        const input = inputFor(id);
        const withPages = (max_crawl_pages: number) => ({
            ...input,
            body: { ...(input.body as Record<string, Json>), max_crawl_pages },
        });
        await rejects(id, withPages(0));
        await rejects(id, withPages(-1));
        await validates(id, withPages(1));
    }
    assertEquals(seen, 10);
    // YouTube: the vendor's knob is block_depth (1-200, default 20); a
    // `depth` is not a YouTube field and is rejected like any unknown key
    const youtube = "dataforseo#serp/youtube-organic";
    const locale = {
        keyword: "seo api",
        location_code: 2840,
        language_code: "en",
    };
    const tenPages = await validates(youtube, {
        body: { ...locale, block_depth: 200 },
    });
    assertEquals(tenPages.credits, { default: 0.02 });
    await rejects(youtube, { body: { ...locale, block_depth: 0 } });
    await rejects(youtube, { body: { ...locale, depth: 20 } });
});

Deno.test("dataforseo copy: parameter descriptions carry no scraped artifacts — glued defaults, dangling 'Note:', truncated value lists", async () => {
    const bundle = await testBundle();
    for (const id of await dataforseoIds()) {
        const descriptions = Object.values(bundle.endpoints[id].input.schema)
            .flatMap((part) =>
                Object.values(propsOf(part)).flatMap((prop) =>
                    prop.description ?? []
                )
            );
        for (const d of descriptions) {
            assert(
                !/default (?:true|false)[A-Za-z]|Note:\)|…/.test(d),
                `${id}: ${d}`,
            );
        }
    }
});

Deno.test("dataforseo copy: every filter or sort field the summary or description advertises exists in the schema", async () => {
    const bundle = await testBundle();
    for (const id of await dataforseoIds()) {
        const doc = bundle.endpoints[id];
        const body = doc.input.schema.body;
        if (body === undefined) continue; // dictionaries: the query is ours
        const fields = new Set(Object.keys(propsOf(body)));
        const filterFields = [...fields].filter((f) => f.endsWith("filters"));
        const text = `${doc.meta.description} ${doc.meta.summary}`;
        if (/\bfilters\b/.test(text)) {
            assert(
                filterFields.some((f) => text.includes(f)),
                `${id} advertises filters it does not take`,
            );
        }
        if (/\border_by\b/.test(text)) {
            assert(fields.has("order_by"), `${id} advertises order_by`);
        }
        if (/\bsort(?:ed|ing)?\b/i.test(text)) {
            assert(
                fields.has("sort_by") || fields.has("order_by"),
                `${id} advertises sorting it does not take`,
            );
        }
    }
});

/** The vendor's priced switches (v1 `withSurcharges` / `onPageEstimate`). */
const SURCHARGES: Record<string, Json> = {
    calculate_rectangles: true,
    load_async_ai_overview: true,
    people_also_ask_click_depth: 4,
    include_clickstream_data: true,
    load_prices_by_dates: true,
    enable_javascript: true,
    load_resources: true,
    enable_browser_rendering: true,
};
/** Flat (PER_CALL) cards: a count cannot raise their hold, so the extra
 *  settles from the vendor's `cost` above it. */
const FLAT_SURCHARGED = [
    "dataforseo#google-hotels/info",
    "dataforseo#onpage/content-parsing",
    "dataforseo#onpage/instant-pages",
    "dataforseo#serp/google-ai-mode",
];

Deno.test("dataforseo holds: every documented surcharge a metered doc takes raises its hold; google-organic and ranked-keywords at the vendor's rates", async () => {
    const bundle = await testBundle();
    const ids = await dataforseoIds();
    const flat: string[] = [];
    for (const id of ids) {
        const body = bundle.endpoints[id].input.schema.body;
        const priced = Object.keys(propsOf(body)).filter((f) =>
            f in SURCHARGES
        );
        if (priced.length === 0) continue;
        if (bundle.endpoints[id].usage.model.kind === "PER_CALL") {
            flat.push(id);
            continue;
        }
        const input = inputFor(id);
        const base = await validates(id, input);
        for (const field of priced) {
            const on = await validates(id, {
                ...input,
                body: {
                    ...(input.body as Record<string, Json>),
                    [field]: SURCHARGES[field],
                },
            });
            assert(
                on.credits.default > base.credits.default,
                `${id} ${field}: ${on.credits.default}`,
            );
        }
    }
    assertEquals(flat, FLAT_SURCHARGED.filter((id) => ids.includes(id)));
    // google-organic: one page $0.002, each switch one more page price
    const organic = "dataforseo#serp/google-organic";
    const all = await validates(organic, {
        body: {
            keyword: "seo api",
            calculate_rectangles: true,
            load_async_ai_overview: true,
            people_also_ask_click_depth: 1,
        },
    });
    assertEquals(round6(all.credits.default), 0.008);
    // ranked-keywords: clickstream doubles fee + rows
    const ranked = await validates("dataforseo#labs/ranked-keywords", {
        body: {
            target: "dataforseo.com",
            limit: 3,
            include_clickstream_data: true,
        },
    });
    assertEquals(round6(ranked.credits.default), 0.02472);
    // calculate_rectangles doubles the whole task where the vendor says
    // "multiplied by 2": 3 image pages hold 6, seznam depth 15 (2 pages)
    // holds 4
    const image = await validates("dataforseo#serp/google-search-by-image", {
        body: {
            image_url: "https://example.com/a.png",
            max_crawl_pages: 3,
            calculate_rectangles: true,
        },
    });
    assertEquals(round6(image.credits.default), 0.0072);
    const seznam = await validates("dataforseo#serp/seznam-organic", {
        body: { keyword: "seo api", depth: 15, calculate_rectangles: true },
    });
    assertEquals(round6(seznam.credits.default), 0.0048);
});

/** The docs whose vendor contract needs one of several identifiers. */
const AT_LEAST_ONE = [
    "dataforseo#domain/domains-by-technology",
    "dataforseo#domain/technologies-summary",
    "dataforseo#google-business/extended-reviews",
    "dataforseo#google-business/reviews",
    "dataforseo#google-shopping/product-info",
    "dataforseo#google-shopping/sellers",
    "dataforseo#tripadvisor/reviews",
];

Deno.test("dataforseo gates: an 'at least one of' body passes with one identifier and is refused with none", async () => {
    const bundle = await testBundle();
    const ids = await dataforseoIds();
    const unions: string[] = [];
    for (const id of ids) {
        const arms = (bundle.endpoints[id].input.schema.body as
            | { anyOf?: { required?: string[] }[] }
            | undefined)?.anyOf;
        if (arms === undefined) continue;
        unions.push(id);
        const shared = arms.map((arm) => new Set(arm.required ?? []))
            .reduce((a, b) => new Set([...a].filter((f) => b.has(f))));
        const identifiers = new Set(
            arms.flatMap((arm) => arm.required ?? []).filter((f) =>
                !shared.has(f)
            ),
        );
        assert(identifiers.size >= 2, id);
        const input = inputFor(id);
        await validates(id, input);
        const body = Object.fromEntries(
            Object.entries(input.body as Record<string, Json>).filter((
                [f],
            ) => !identifiers.has(f)),
        );
        await rejects(id, { ...input, body });
    }
    assertEquals(unions, AT_LEAST_ONE.filter((id) => ids.includes(id)));
});

Deno.test("dataforseo gates: every filter field takes the vendor's expression array — conditions as arrays joined by and / or", async () => {
    const bundle = await testBundle();
    const expression: Json = [["rank", ">", 10], "and", ["type", "=", "x"]];
    let seen = 0;
    for (const id of await dataforseoIds()) {
        const fields = Object.keys(
            propsOf(bundle.endpoints[id].input.schema.body),
        ).filter((f) => f.endsWith("filters"));
        for (const field of fields) {
            seen++;
            const input = inputFor(id);
            await validates(id, {
                ...input,
                body: {
                    ...(input.body as Record<string, Json>),
                    [field]: expression,
                },
            });
        }
    }
    assert(seen > 0);
});

Deno.test("dataforseo gates: an omitted limit / depth holds the vendor's default page; the estimate holds pages × price or fee + rows × price", async () => {
    const organic = "dataforseo#serp/google-organic";
    const omitted = await validates(organic, { body: { keyword: "seo api" } });
    assertEquals(omitted.credits, { default: 0.002 });
    assertEquals(omitted.evidence, { RESULT: 10 });
    await rejects(organic, { body: { keyword: "seo api", depth: 201 } });
    const pages = await validates(organic, {
        body: { keyword: "seo api", depth: 30 },
    });
    assertEquals(pages.credits, { default: 0.006 });
    assertEquals(pages.evidence, { RESULT: 30 });
    const crawl = await validates(organic, {
        body: { keyword: "seo api", depth: 10, max_crawl_pages: 3 },
    });
    assertEquals(crawl.credits, { default: 0.006 });
    const ranked = "dataforseo#labs/ranked-keywords";
    const page = await validates(ranked, {
        body: { target: "dataforseo.com" },
    });
    assertEquals(round6(page.credits.default), 0.024);
    assertEquals(page.evidence, { base_fee: 1, rows: 100 });
    await rejects(ranked, { body: { target: "dataforseo.com", limit: 0 } });
    const rows = await validates(ranked, {
        body: { target: "dataforseo.com", limit: 3 },
    });
    assertEquals(round6(rows.credits.default), 0.01236);
    assertEquals(rows.evidence, { base_fee: 1, rows: 3 });
    const bulk = "dataforseo#backlinks/bulk-ranks";
    const two = await validates(bulk, {
        body: { targets: ["dataforseo.com", "ahrefs.com"] },
    });
    assertEquals(round6(two.credits.default), 0.024072);
    assertEquals(two.evidence, { base_fee: 1, rows: 2 });
    const image = "dataforseo#serp/google-search-by-image";
    const onePage = await validates(image, {
        body: { image_url: "https://example.com/a.png" },
    });
    assertEquals(onePage.evidence, { RESULT: 100 });
    const fixed = "dataforseo#backlinks/summary";
    const one = await validates(fixed, { body: { target: "dataforseo.com" } });
    assertEquals(one.evidence, { base_fee: 1, rows: 1 });
    const jobs = "dataforseo#serp/google-jobs";
    const queued = await validates(jobs, { body: { keyword: "seo api" } });
    assertEquals(queued.credits, { default: 0.0012 });
    assertEquals(queued.evidence, { RESULT: 10 });
    // the dictionary: both knobs optional, limit capped, country two letters
    const locations = "dataforseo#serp/google-locations";
    await validates(locations, { pathParams: { country: "us" } });
    await rejects(locations, {
        pathParams: { country: "us" },
        queryParams: { limit: 1001 },
    });
    await rejects(locations, {
        pathParams: { country: "usa" },
        queryParams: { limit: 10 },
    });
    await validates(locations, {
        pathParams: { country: "us" },
        queryParams: { limit: 1000 },
    });
});

// ---------------------------------------------------------------------------
// live (gated)
// ---------------------------------------------------------------------------

Deno.test({
    name:
        "dataforseo live: serp/google-locations, a free lookup (gated on DATAFORSEO_CREDENTIALS_LOGIN / _PASSWORD)",
    ignore: liveSkip("dataforseo", DATAFORSEO_KEYS),
    fn: async () => {
        const id = "dataforseo#serp/google-locations";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: {
                pathParams: { country: "us" },
                queryParams: { search: "seattle", limit: 5 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assert(Array.isArray(result.output));
        assert((result.output as unknown[]).length > 0);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});

Deno.test({
    name:
        "dataforseo live: serp/google-organic, one page (gated on DATAFORSEO_CREDENTIALS_LOGIN / _PASSWORD)",
    ignore: liveSkip("dataforseo", DATAFORSEO_KEYS),
    fn: async () => {
        const id = "dataforseo#serp/google-organic";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const rows = result.output as { items?: unknown[] }[];
        assert(Array.isArray(rows) && rows.length === 1);
        assert(Array.isArray(rows[0].items));
        // shape, not amount: the receipt is the vendor's and may carry
        // the AI-overview surcharge
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals(result.usage.evidence, { RESULT: 10 });
    },
});
