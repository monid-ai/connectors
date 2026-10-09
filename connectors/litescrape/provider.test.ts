import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * THE litescrape suite (design D6, the surf D2 layout): 33 docs of ONE
 * billing shape — a PER_UNIT·RESULT line of one Litescrape credit, settled
 * 0|1 by each endpoint's own result-group check — so the tests live once
 * here and iterate the catalog, while every endpoint keeps its OWN
 * fixtures under `endpoints/<family>/<path>/fixtures/` (replay matches on
 * the exact wire URL, so a shared chain cannot serve query-bearing GETs;
 * `deno task record` writes there too). The first endpoint of each family
 * carries the unauthorized scenario; the endpoints whose empty shape v1
 * drilled carry the empty one.
 *
 * Litescrape declares NO `usage.consolidate` (design D2): no response
 * carries a meter, so the DERIVED fold is the settled answer on every run
 * and no `mismatch` key can appear (zUsage is strict; deep-equality proves
 * its absence). The rate table below is therefore the only thing standing
 * between a typo and a wrong bill.
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

/** Fixture dir: `endpoints/<family>/<wire path, slashes as dashes>/fixtures/`
 *  (design D1 — the loader wants leaf names unique across groups). */
const fixtureFor = (id: string, name: string) => {
    const path = id.split("#")[1];
    const family = path.split("/")[0];
    return loadFixture(
        `${HERE}endpoints/${family}/${
            path.replaceAll("/", "-")
        }/fixtures/${name}.json`,
    );
};

const litescrapeIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("litescrape#"))
        .sort();
};

/** Validate-only run: the estimate derives the input without IO, so a
 *  rejecting transport proves whether an input passes the compiled gate. */
const validates = async (id: string, queryParams: Record<string, Json>) => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return await loaded.estimate({ queryParams });
};

const rejects = (id: string, queryParams: Record<string, Json>) =>
    assertRejects(() => validates(id, queryParams), Error, "INVALID_INPUT");

/**
 * Litescrape's draw per endpoint — one credit per successful call on EVERY
 * endpoint: $0.15 per 1,000 calls flat (https://litescrape.com/pricing,
 * captured 2026-09-16), confirmed by v1's 2026-09-18 drill (68 HTTP 200 →
 * 68 calls deducted, non-2xx free). Written as LITERALS on purpose (clay
 * D7a): deriving them from each doc's own model would make this test a
 * tautology — the engine folds credits FROM the model, so an edited
 * `consumes.amount` would move both sides and pass. A new endpoint must
 * state its row here.
 */
const RATE: Record<string, number> = {
    "litescrape#apple/app-store/product": 1,
    "litescrape#apple/app-store/reviews": 1,
    "litescrape#apple/app-store/search": 1,
    "litescrape#apple/maps/places": 1,
    "litescrape#apple/maps/reviews": 1,
    "litescrape#bing/maps": 1,
    "litescrape#bing/search": 1,
    "litescrape#duckduckgo/maps": 1,
    "litescrape#duckduckgo/search": 1,
    "litescrape#google/ads": 1,
    "litescrape#google/ai-mode": 1,
    "litescrape#google/ai-overview": 1,
    "litescrape#google/contributor-reviews": 1,
    "litescrape#google/local": 1,
    "litescrape#google/maps": 1,
    "litescrape#google/maps/photo-meta": 1,
    "litescrape#google/maps/popular-times": 1,
    "litescrape#google/maps/posts": 1,
    "litescrape#google/play/apps": 1,
    "litescrape#google/play/books": 1,
    "litescrape#google/play/games": 1,
    "litescrape#google/play/movies": 1,
    "litescrape#google/play/product": 1,
    "litescrape#google/play/reviews": 1,
    "litescrape#google/reviews": 1,
    "litescrape#google/search": 1,
    "litescrape#google/shopping": 1,
    "litescrape#google/shopping/product": 1,
    "litescrape#tripadvisor/place": 1,
    "litescrape#tripadvisor/reviews": 1,
    "litescrape#tripadvisor/search": 1,
    "litescrape#yelp/reviews": 1,
    "litescrape#yelp/search": 1,
};

/** The first endpoint of each family carries the unauthorized fixture (the
 *  error digest is the same code path on every doc; the URL match is proven
 *  per endpoint by the happy run). */
const FAMILY_REPRESENTATIVES = [
    "litescrape#google/search",
    "litescrape#apple/maps/places",
    "litescrape#bing/search",
    "litescrape#duckduckgo/search",
    "litescrape#yelp/search",
    "litescrape#tripadvisor/search",
] as const;

/** The empty shapes v1 drilled (2026-09-18): a page past the end, an empty
 *  group, `popular_times: null`, and a listing with no `posts` group at all. */
const EMPTY_CASES = [
    "litescrape#google/search",
    "litescrape#google/maps",
    "litescrape#google/maps/popular-times",
    "litescrape#google/maps/posts",
    "litescrape#google/reviews",
    "litescrape#apple/app-store/reviews",
    "litescrape#bing/maps",
    "litescrape#duckduckgo/search",
    "litescrape#yelp/reviews",
    "litescrape#tripadvisor/reviews",
] as const;

// ---------------------------------------------------------------------------
// the catalog
// ---------------------------------------------------------------------------

Deno.test("litescrape docs: every endpoint is in the rate table", async () => {
    const ids = await litescrapeIds();
    assertEquals(ids.length, 33);
    // a new endpoint must state its draw
    assertEquals(Object.keys(RATE).sort(), ids);
});

Deno.test("litescrape docs: one auth, one CSV join, one error digest, one estimate, no consolidate, an own evidence per doc", async () => {
    const bundle = await testBundle();
    const ids = await litescrapeIds();
    const first = bundle.endpoints[ids[0]];
    const evidenceKeys = new Set<string>();
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            bundle.fnTable[doc.auth.inject.$fn.key].provenance,
            "presets#auth.bearer",
            id,
        );
        // the array→CSV join is the provider's (akta's hook, interned)
        assertEquals(
            doc.input.toRequest?.$fn.key,
            first.input.toRequest?.$fn.key,
            id,
        );
        assert(doc.input.toRequest, `${id}: the CSV join must run`);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assert(doc.output.fromError, `${id}: the error digest must run`);
        // the links are relayed verbatim (design D5): no reshaping
        assertEquals(doc.output.fromResponse, undefined, id);
        // no vendor claim anywhere (design D2)
        assertEquals(doc.usage.consolidate, undefined, id);
        // one credit per call with results, on every doc
        assertEquals(doc.usage.model, {
            kind: "PER_UNIT",
            unit: "RESULT",
            every: 1,
            label: "calls with results",
            description: "calls whose response carried a result group",
            consumes: { credit: "default", amount: RATE[id] },
        }, id);
        assertEquals(
            doc.usage.credits,
            { default: { label: "Litescrape credits" } },
            id,
        );
        // the one-call promise is the provider's; the 0|1 evidence is the
        // doc's own (design D3) — never the compiler's empty synthesis
        assertEquals(
            doc.usage.estimate.$fn.key,
            first.usage.estimate.$fn.key,
            id,
        );
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance.startsWith(
                "connectors/litescrape/endpoints/",
            ),
            true,
            id,
        );
        evidenceKeys.add(doc.usage.evidence.$fn.key);
        assertEquals(doc.lifecycle, undefined, id);
        assertEquals(doc.timeouts, { requestMs: 120_000, runMs: 120_000 }, id);
        // the `/api` prefix rides the base URL; the id is the vendor's
        // `<engine>/<kind>` path (design D1)
        assertEquals(
            doc.request.url,
            `https://api.litescrape.com/api/${id.split("#")[1]}`,
            id,
        );
        assertEquals(doc.request.method, "GET", id);
        assertEquals(
            doc.meta.docsUrl?.startsWith("https://litescrape.com/docs/"),
            true,
            id,
        );
    }
    // endpoints with the same result-group list intern to one fn: the six
    // `["reviews"]` readers share one, the two Play chart listings another
    assertEquals(
        bundle.endpoints["litescrape#google/reviews"].usage.evidence.$fn.key,
        bundle.endpoints["litescrape#yelp/reviews"].usage.evidence.$fn.key,
    );
    assertEquals(
        bundle.endpoints["litescrape#google/play/books"].usage.evidence.$fn
            .key,
        bundle.endpoints["litescrape#google/play/movies"].usage.evidence.$fn
            .key,
    );
    assertEquals(evidenceKeys.size, 22);
});

Deno.test("litescrape meta: the verbatim-links caveat rides every doc; the vendor's combination rules ride notes", async () => {
    const bundle = await testBundle();
    for (const id of await litescrapeIds()) {
        const notes = (bundle.endpoints[id].meta.notes ?? []).join(" ");
        assert(
            notes.includes("relayed verbatim") &&
                notes.includes("litescrape#<path>"),
            `${id}: the provider's link note must reach the doc`,
        );
        assert(
            notes.includes("records 0 for a 200"),
            `${id}: the provider's empty-success note must reach the doc`,
        );
    }
    const notesOf = (id: string) =>
        (bundle.endpoints[id].meta.notes ?? []).join(" ");
    // the identifier alternatives compile to anyOf; the exclusivity and the
    // paired / dependent fields are notes (DEVELOPMENT.md)
    assert(notesOf("litescrape#google/search").includes("at least one of `q`"));
    assert(notesOf("litescrape#google/reviews").includes("Exactly one of"));
    assert(
        notesOf("litescrape#google/maps").includes("`lat` and `lon` travel"),
    );
    assert(
        notesOf("litescrape#google/shopping").includes(
            "one refinement at a time",
        ),
    );
    assert(
        notesOf("litescrape#google/play/apps").includes(
            "at most one of `chart`",
        ),
    );
    assert(notesOf("litescrape#bing/search").includes("`mkt` or `cc`"));
    // the eleven Alpha upstreams say so
    const alpha = (await litescrapeIds()).filter((id) =>
        notesOf(id).includes("Alpha upstream")
    );
    assertEquals(alpha, [
        "litescrape#apple/app-store/product",
        "litescrape#apple/app-store/reviews",
        "litescrape#apple/app-store/search",
        "litescrape#google/ads",
        "litescrape#google/local",
        "litescrape#google/play/apps",
        "litescrape#google/play/books",
        "litescrape#google/play/games",
        "litescrape#google/play/movies",
        "litescrape#google/play/product",
        "litescrape#google/play/reviews",
    ]);
    // no rule, no note beyond the provider's four
    assertEquals(
        bundle.endpoints["litescrape#yelp/search"].meta.notes?.length,
        4,
    );
});

Deno.test("litescrape schemas: strict mirrors, unions without defaults, the live-doc additions", async () => {
    const bundle = await testBundle();
    const search = bundle.endpoints["litescrape#google/search"].input.schema
        .queryParams as {
            anyOf: {
                required: string[];
                additionalProperties: boolean;
                properties: Record<
                    string,
                    { default?: Json; description?: string }
                >;
            }[];
        };
    assertEquals(search.anyOf.map((arm) => arm.required), [["q"], [
        "ludocid",
    ], ["kgmid"]]);
    for (const arm of search.anyOf) {
        assertEquals(arm.additionalProperties, false);
        // ajv never applies defaults inside anyOf — none authored anywhere
        for (const [name, prop] of Object.entries(arm.properties)) {
            assertEquals(prop.default, undefined, name);
            assert(prop.description, `${name}: describe survived`);
        }
        // the three autocomplete tokens the live docs added after v1 (D9)
        for (const added of ["oq", "gs_lp", "sclient"]) {
            assert(added in arm.properties, added);
        }
    }
    // the overview shares the contract minus fast_mode
    const overview = bundle.endpoints["litescrape#google/ai-overview"].input
        .schema.queryParams as {
            anyOf: { properties: Record<string, Json> }[];
        };
    assertEquals("fast_mode" in overview.anyOf[0].properties, false);
    assertEquals(
        Object.keys(overview.anyOf[0].properties).length,
        Object.keys(search.anyOf[0].properties).length - 1,
    );
    // "exactly one": each arm omits the other identifier (surf D4)
    const reviews = bundle.endpoints["litescrape#google/reviews"].input.schema
        .queryParams as {
            anyOf: { required: string[]; properties: Record<string, Json> }[];
        };
    assertEquals(reviews.anyOf.map((arm) => arm.required), [["place_id"], [
        "data_id",
    ]]);
    assertEquals("data_id" in reviews.anyOf[0].properties, false);
    assertEquals("place_id" in reviews.anyOf[1].properties, false);
    // the plain mirrors are strict too
    const places = bundle.endpoints["litescrape#apple/maps/places"].input.schema
        .queryParams as {
            additionalProperties: boolean;
            required: string[];
            properties: {
                muid: { type: string; minItems: number; maxItems: number };
            };
        };
    assertEquals(places.additionalProperties, false);
    assertEquals(places.required, ["muid"]);
    assertEquals(places.properties.muid.type, "array");
    assertEquals(places.properties.muid.maxItems, 50);
});

// ---------------------------------------------------------------------------
// the 33 relays
// ---------------------------------------------------------------------------

Deno.test("litescrape: every endpoint's happy run draws one credit and relays the body verbatim, links included", async () => {
    for (const id of await litescrapeIds()) {
        const fixture = await fixtureFor(id, "synthetic-happy");
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: { default: RATE[id] },
            evidence: { RESULT: 1 },
        }, id);
        // nothing is stripped or rewritten (design D5): the vendor's
        // api.litescrape.com links reach the caller as they came
        assertEquals(result.output, fixture.calls[0].res.body, id);
        assert(
            JSON.stringify(result.output).includes(
                "https://api.litescrape.com/api/",
            ),
            `${id}: the fixture carries a follow-up link`,
        );
    }
});

Deno.test("litescrape: the CSV join — Apple muid and Yelp rating / attrs arrays travel as one comma-separated value", async () => {
    for (
        const [id, param, joined] of [
            [
                "litescrape#apple/maps/places",
                "muid",
                "4372355869446211302,4560078147072908047",
            ],
            ["litescrape#yelp/reviews", "rating", "4,5"],
            ["litescrape#yelp/search", "attrs", "open_now,price.1"],
        ] as const
    ) {
        // replay matches the exact wire URL, so a successful happy replay IS
        // the proof; this pins what the fixture's URL says on the wire
        const fixture = await fixtureFor(id, "synthetic-happy");
        const url = new URL(fixture.calls[0].req.url);
        assertEquals(url.searchParams.get(param), joined, id);
        assertEquals(url.searchParams.getAll(param).length, 1, id);
    }
});

Deno.test("litescrape: an empty success records 0 — the owner kept v1's posture", async () => {
    for (const id of EMPTY_CASES) {
        const fixture = await fixtureFor(id, "synthetic-empty");
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: {},
            evidence: { RESULT: 0 },
        }, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("litescrape: a 401 is data — zero usage, the stable error body digested", async () => {
    for (const id of FAMILY_REPRESENTATIVES) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: await fixtureFor(id, "synthetic-unauthorized"),
        });
        assertEquals(result.httpStatus, 401, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as Record<string, unknown>;
        assertEquals(output.message, "The API key is invalid.", id);
        assertEquals(output.error_code, "invalid_api_key", id);
        assertEquals(
            (output.raw as { request_id: string }).request_id,
            "f3e4670018cfc1a92a56a2db",
            id,
        );
    }
});

Deno.test("litescrape: the overview's free 404 and a 400 invalid_request are data", async () => {
    const overview = "litescrape#google/ai-overview";
    const missing = await runEndpoint({
        unit: await testSealedUnit(overview),
        input: inputFor(overview),
        mode: "replay",
        fixture: await fixtureFor(overview, "synthetic-not-found"),
    });
    assertEquals(missing.httpStatus, 404);
    assertEquals(missing.isProviderError, true);
    assertEquals(missing.usage, { credits: {}, evidence: {} });
    assertEquals(
        (missing.output as { error_code: string }).error_code,
        "not_found",
    );
    const search = "litescrape#google/search";
    const invalid = await runEndpoint({
        unit: await testSealedUnit(search),
        input: inputFor(search),
        mode: "replay",
        fixture: await fixtureFor(search, "synthetic-invalid-request"),
    });
    assertEquals(invalid.httpStatus, 400);
    assertEquals(invalid.isProviderError, true);
    assertEquals(invalid.usage, { credits: {}, evidence: {} });
    assertEquals(
        (invalid.output as { message: string }).message,
        "API does not recognize parameters: bogus",
    );
});

// ---------------------------------------------------------------------------
// the gates
// ---------------------------------------------------------------------------

Deno.test("litescrape: every input schema is strict — an unknown key never reaches the wire", async () => {
    for (const id of await litescrapeIds()) {
        const input = inputFor(id).queryParams as Record<string, Json>;
        await rejects(id, { ...input, not_a_litescrape_param: "1" });
        // and the test input itself passes the gate
        await validates(id, input);
    }
});

Deno.test("litescrape gates: the identifier alternatives and their near twins", async () => {
    // at least one of q / ludocid / kgmid
    await rejects("litescrape#google/search", { num: 5 });
    await validates("litescrape#google/search", { kgmid: "/m/0k8z" });
    // a search needs type; an exact place needs exactly one id
    await rejects("litescrape#google/maps", { q: "coffee" });
    await rejects("litescrape#google/maps", {
        place_id: "ChIJexampleplaceid000001",
        data_cid: "123",
    });
    await validates("litescrape#google/maps", { q: "coffee", type: "search" });
    await validates("litescrape#google/maps", { data_cid: "123" });
    // exactly one of place_id / data_id
    await rejects("litescrape#google/reviews", {
        place_id: "ChIJexampleplaceid000001",
        data_id: "0x1:0x2",
    });
    await rejects("litescrape#google/reviews", { num: 5 });
    await validates("litescrape#google/reviews", { data_id: "0x1:0x2" });
    // gpcid xor prds; the docids ride with gpcid only
    await rejects("litescrape#google/shopping/product", {
        q: "coffee maker",
        prds: "token",
        gpcid: "1",
    });
    await rejects("litescrape#google/shopping/product", {
        q: "coffee maker",
        prds: "token",
        image_docid: "1",
    });
    await validates("litescrape#google/shopping/product", {
        q: "coffee maker",
        prds: "token",
    });
    // q or shoprs; q or place_id
    await rejects("litescrape#google/shopping", { num: 5 });
    await validates("litescrape#google/shopping", { shoprs: "CAEQAg" });
    await rejects("litescrape#bing/maps", { count: 5 });
    await validates("litescrape#bing/maps", { place_id: "YN873x1" });
    // bbox xor the lat/lon pair
    await rejects("litescrape#duckduckgo/maps", {
        q: "coffee",
        bbox: "1,2,3,4",
        lat: 1,
        lon: 2,
    });
    await rejects("litescrape#duckduckgo/maps", { q: "coffee", lat: 1 });
    await validates("litescrape#duckduckgo/maps", {
        q: "coffee",
        lat: 1,
        lon: 2,
    });
});

Deno.test("litescrape gates: the single-field patterns and bounds", async () => {
    // muid: an unsigned 64-bit decimal — the boundary both ways
    await validates("litescrape#apple/maps/reviews", {
        muid: "18446744073709551615",
    });
    await rejects("litescrape#apple/maps/reviews", {
        muid: "18446744073709551616",
    });
    await rejects("litescrape#apple/maps/reviews", {
        muid: "4372355869446211302x",
    });
    await rejects("litescrape#apple/maps/places", {
        muid: ["4372355869446211302", "18446744073709551616"],
    });
    // the Maps viewport and feature id formats
    await rejects("litescrape#google/maps", {
        q: "coffee",
        type: "search",
        ll: "30.2672,-97.7431,14z",
    });
    await validates("litescrape#google/maps", {
        q: "coffee",
        type: "search",
        ll: "@30.2672,-97.7431,14z",
    });
    await rejects("litescrape#google/maps/posts", { data_id: "ChIJnotahex" });
    await rejects("litescrape#google/contributor-reviews", {
        contributor_id: "123456789",
    });
    await validates("litescrape#google/contributor-reviews", {
        contributor_id: "1234567890",
    });
    // enums and numeric bounds
    await rejects("litescrape#google/search", { q: "x", tbm: "isch" });
    await rejects("litescrape#google/search", { q: "x", num: 101 });
    await rejects("litescrape#google/search", {
        q: "x",
        as_lq: "data:text/plain,x",
    });
    await validates("litescrape#google/search", {
        q: "x",
        as_lq: "https://example.com",
    });
    await rejects("litescrape#google/reviews", { place_id: "p", num: 0 });
    await rejects("litescrape#yelp/reviews", { place_id: "p", rating: [6] });
    await rejects("litescrape#yelp/reviews", { place_id: "p", q: "x" });
    await rejects("litescrape#yelp/search", {
        find_loc: "Austin",
        yelp_domain: "yelp.com",
    });
    await validates("litescrape#yelp/search", {
        find_loc: "Austin",
        yelp_domain: "www.yelp.co.uk",
    });
    await rejects("litescrape#apple/app-store/search", { term: "x", num: 201 });
    await rejects("litescrape#apple/app-store/product", {
        product_id: "0570060128",
    });
    await rejects("litescrape#tripadvisor/place", {
        place_id: "1234567",
        currency: "eur",
    });
    await rejects("litescrape#duckduckgo/search", { q: "x", df: "2026-01-01" });
    await validates("litescrape#duckduckgo/search", {
        q: "x",
        df: "2026-01-01..2026-02-01",
    });
    await rejects("litescrape#google/play/product", {
        product_id: "com.example.one",
        store: "games",
    });
});

// ---------------------------------------------------------------------------
// live (gated)
// ---------------------------------------------------------------------------

Deno.test({
    name: "litescrape live: google/search (gated on LITESCRAPE_API_KEY)",
    ignore: liveSkip("litescrape"),
    fn: async () => {
        const id = "litescrape#google/search";
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
        const output = result.output as { organic_results?: unknown };
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
        assertEquals(Array.isArray(output.organic_results), true);
        assertEquals(result.usage, {
            credits: { default: 1 },
            evidence: { RESULT: 1 },
        });
    },
});
