import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { z } from "zod";
import { fromFileUrl, join } from "@std/path";
import {
    type ConnectorSource,
    defineEndpoint,
    defineProvider,
    type EndpointDefSeed,
    fnKeysOf,
    inspectEndpoint,
    listCategories,
    listEndpoints,
    listProviders,
    loadCategoryRegistry,
    loadConnectorDefs,
    presets,
    type ProviderDefSeed,
    sealUnit,
    stableStringify,
    zBundle,
} from "@shared/core";
import {
    compileBundle,
    lintClosedTerm,
    normalizeFnSource,
} from "@shared/compiler";

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));

const OPTS = {
    compilerVersion: "0.1.0",
    builtWithEngineVersion: "0.1.0",
    catalogVersion: "0.0.0-test",
    generatedAt: "1970-01-01T00:00:00.000Z",
    leafCategories: [
        { id: "demo-cat", displayName: "Demo Category" },
        { id: "web-search", displayName: "Web Search" },
        { id: "web-scraping", displayName: "Web Scraping" },
    ],
} as const;

function makeProvider(overrides: Partial<ProviderDefSeed> = {}) {
    return defineProvider({
        name: "demo",
        meta: { displayName: "Demo", summary: "A demo provider." },
        auth: { inject: presets.auth.header("x-demo-key") },
        request: { baseUrl: "https://api.demo.test" },
        usage: { consolidate: presets.usage.perCall() },
        ...overrides,
    });
}

function makeEndpoint(overrides: Partial<EndpointDefSeed> = {}) {
    return defineEndpoint({
        meta: {
            displayName: "Demo Search",
            summary: "Searches.",
            categories: ["demo-cat"],
        },
        request: { method: "POST", path: "/search" },
        input: { schema: { body: z.object({ q: z.string() }) } },
        ...overrides,
    });
}

function source(
    endpoints: { name: string; def: ReturnType<typeof makeEndpoint> }[],
    provider = makeProvider(),
): ConnectorSource[] {
    return [{ provider, endpoints }];
}

// ---------------------------------------------------------------------------
// normalization (TS printer — no subprocess, no hand-rolled stripping)
// ---------------------------------------------------------------------------

Deno.test("normalization: comments and formatting do not change the source", () => {
    const a = normalizeFnSource(
        `({ data, utils }) => /* strip! */ ({ ...data.input })`,
    );
    const b = normalizeFnSource(`({ data,   utils }) =>
        ({ ...data.input })   // trailing`);
    assertEquals(a, b);
});

Deno.test("normalization is string-aware (urls are not comments)", () => {
    const normal = normalizeFnSource(
        `(x) => "http://not-a-comment" // real comment`,
    );
    assert(normal.includes("http://not-a-comment"));
    assert(!normal.includes("real comment"));
});

Deno.test("normalization: COMPACT — author newlines/tabs replaced, one line out", () => {
    // whitespace is not preserved; it is replaced by the compact normal form
    assertEquals(
        normalizeFnSource("({ data, utils }) =>\n({\n\t...data.input,\n})"),
        "({data,utils})=>({...data.input,})",
    );
    // keyword adjacency keeps the single required space
    assertEquals(
        normalizeFnSource("(x) => { return x + 1; }"),
        "(x)=>{return x+1;}",
    );
    // unary +/- never merge into ++/--
    assertEquals(
        normalizeFnSource("(a, b) => a + +b - -a"),
        "(a,b)=>a+ +b- -a",
    );
});

Deno.test("normalization: layout variants of the SAME fn produce one byte-form", () => {
    // CRLF vs LF twins
    assertEquals(
        normalizeFnSource("(x) => {\r\n    return x;\r\n}"),
        normalizeFnSource("(x) => {\n    return x;\n}"),
    );
    // tabs vs spaces, single-line vs multi-line (the raw TS printer preserves
    // source line layout — compaction is what makes this hold)
    assertEquals(
        normalizeFnSource("({ data }) => ({ ...data.input })"),
        normalizeFnSource("({ data }) =>\n({\n\t...data.input\n})"),
    );
});

Deno.test("normalization: literal contents survive verbatim", () => {
    // semantic newline INSIDE a template literal is content, not layout
    assertEquals(normalizeFnSource("(x) => `a\nb=${x}!`"), "(x)=>`a\nb=${x}!`");
    // regex literal with internal spaces kept byte-exact (slash rescan)
    assertEquals(
        normalizeFnSource("(s) => / a b /.test(s)"),
        "(s)=>/ a b /.test(s)",
    );
    // division is NOT mistaken for a regex
    assertEquals(normalizeFnSource("(a, b) => a / b / 2"), "(a,b)=>a/b/2");
});

Deno.test("closed-term lint rejects free identifiers, allows params/locals/whitelist", () => {
    lintClosedTerm(
        `({ data, utils }) => { const n = utils.json.len(data.output, "$.r"); return Math.min(n, 5); }`,
        "ok",
    );
    let threw = false;
    try {
        lintClosedTerm(`(ctx) => Unit.RESULT`, "free");
    } catch (error) {
        threw = true;
        assert(String(error).includes("Unit"));
    }
    assert(threw, "expected free-identifier error");
});

// ---------------------------------------------------------------------------
// compilation
// ---------------------------------------------------------------------------

Deno.test("compile produces doc maps + interned table; ids inferred; closure holds", async () => {
    const bundle = await compileBundle(
        source([
            { name: "search", def: makeEndpoint() },
            { name: "other", def: makeEndpoint() },
        ]),
        OPTS,
    );
    // maps keyed by identity — uniqueness by construction
    assertEquals(Object.keys(bundle.endpoints).sort(), [
        "demo#other",
        "demo#search",
    ]);
    assertEquals(Object.keys(bundle.providers), ["demo"]);
    const other = bundle.endpoints["demo#other"];
    const search = bundle.endpoints["demo#search"];
    // interning: identical fallback fns share one entry
    assertEquals(
        other.usage.consolidate.$fn.key,
        search.usage.consolidate.$fn.key,
    );
    assertEquals(other.auth.inject.$fn.key, search.auth.inject.$fn.key);
    // fnTable closure in BOTH directions
    const referenced = new Set(
        Object.values(bundle.endpoints).flatMap((doc) => fnKeysOf(doc)),
    );
    assertEquals(new Set(Object.keys(bundle.fnTable)), referenced);
    // slim ProviderDoc: identity + display only (no endpoint index, no credentials)
    assertEquals(bundle.providers["demo"].name, "demo");
    assertEquals("endpoints" in bundle.providers["demo"], false);
    assertEquals("credentials" in bundle.providers["demo"], false);
    // taxonomy: full registry + endpoint membership
    assertEquals(bundle.taxonomy.leaves.length, 3);
    assertEquals(bundle.taxonomy.membership["demo-cat"], [
        "demo#other",
        "demo#search",
    ]);
    // toolchain provenance (never a gate)
    assertEquals(bundle.toolchain, {
        compilerVersion: "0.1.0",
        builtWithEngineVersion: "0.1.0",
    });
});

Deno.test("usage.consolidate is REQUIRED: endpoint ?? provider, neither fails", async () => {
    await assertRejects(
        () =>
            compileBundle(
                source(
                    [{ name: "search", def: makeEndpoint() }],
                    makeProvider({ usage: undefined }),
                ),
                OPTS,
            ),
        Error,
        "usage.consolidate must resolve",
    );
    // provider-level fallback fills every endpoint
    const bundle = await compileBundle(
        source([{ name: "search", def: makeEndpoint() }]),
        OPTS,
    );
    assert(
        bundle.endpoints["demo#search"].usage.consolidate.$fn.key.startsWith(
            "sha256:",
        ),
    );
});

Deno.test("auth.inject is REQUIRED: endpoint ?? provider, neither fails", async () => {
    await assertRejects(
        () =>
            compileBundle(
                source(
                    [{ name: "search", def: makeEndpoint() }],
                    makeProvider({ auth: undefined }),
                ),
                OPTS,
            ),
        Error,
        "auth.inject must resolve",
    );
});

Deno.test("leaf-wise fallback: endpoint hook REPLACES provider's; baseUrl/meta fall back", async () => {
    const bundle = await compileBundle(
        source(
            [{
                name: "search",
                def: makeEndpoint({
                    meta: { displayName: "S", summary: "s." }, // no docsUrl/categories
                    request: {
                        method: "POST",
                        path: "/search",
                        baseUrl: "https://override.test",
                    },
                    input: {
                        schema: { body: z.object({ q: z.string() }) },
                        toRequest: ({ data }) => ({
                            ...data.input,
                            body: { endpoint: true },
                        }),
                    },
                }),
            }],
            makeProvider({
                meta: {
                    displayName: "Demo",
                    summary: "A demo provider.",
                    docsUrl: "https://demo.test/docs",
                    categories: ["demo-cat"],
                },
                input: { toRequest: ({ data }) => data.input },
            }),
        ),
        OPTS,
    );
    const doc = bundle.endpoints["demo#search"];
    // hook: SINGLE ref — the endpoint's fn, not the provider's (fallback, not chain)
    assert(doc.input.toRequest);
    const src = bundle.fnTable[doc.input.toRequest.$fn.key].src;
    assert(src.includes("endpoint:true"), "endpoint hook won the fallback");
    // data: endpoint baseUrl overrides the provider default
    assertEquals(doc.request.url, "https://override.test/search");
    // meta leaves fall back to the provider
    assertEquals(doc.meta.docsUrl, "https://demo.test/docs");
    assertEquals(doc.meta.categories, ["demo-cat"]);
});

Deno.test("credentials fallback: endpoint overriding only inject inherits the PROVIDER's shape", async () => {
    // Pins the no-.default() rule (design D20): if zAuthSection.credentials
    // used .default(zDefaultCredentials), the endpoint's parsed auth would
    // materialize the default and SHADOW the provider's explicit schema.
    const bundle = await compileBundle(
        source(
            [{
                name: "search",
                def: makeEndpoint({
                    auth: { inject: presets.auth.bearer() }, // no credentials declared
                }),
            }],
            makeProvider({
                auth: {
                    inject: presets.auth.header("x-demo-key"),
                    credentials: z.object({
                        apiKey: z.string().min(1),
                        orgId: z.string().min(1),
                    }),
                },
            }),
        ),
        OPTS,
    );
    const doc = bundle.endpoints["demo#search"];
    // endpoint's inject won the fallback…
    assertEquals(
        bundle.fnTable[doc.auth.inject.$fn.key].provenance,
        "presets#auth.bearer",
    );
    // …but credentials fell back to the provider's EXPLICIT shape, not the default
    assertEquals(
        Object.keys(doc.auth.credentials.properties as Record<string, unknown>)
            .sort(),
        [
            "apiKey",
            "orgId",
        ],
    );
});

Deno.test("baseUrl path prefixes survive resolution (concatenation, not URL-resolve)", async () => {
    // new URL("/v1/x", "https://h/api") would DROP /api — the compiler must
    // concatenate (akta's baseUrl exposed this)
    const bundle = await compileBundle(
        source(
            [{
                name: "search",
                def: makeEndpoint({
                    request: { method: "GET", path: "/v1/search" },
                }),
            }],
            makeProvider({ request: { baseUrl: "https://api.demo.test/api" } }),
        ),
        OPTS,
    );
    assertEquals(
        bundle.endpoints["demo#search"].request.url,
        "https://api.demo.test/api/v1/search",
    );
});

Deno.test("baseUrl with a query string or fragment fails compilation", async () => {
    // concatenation would place the endpoint path INSIDE the query/fragment
    // (`…?tenant=x` + `/v1/search` ⇒ `…?tenant=x/v1/search`) — reject instead
    for (
        const baseUrl of [
            "https://h.test/api?tenant=x",
            "https://h.test/api#frag",
        ]
    ) {
        await assertRejects(
            () =>
                compileBundle(
                    source(
                        [{
                            name: "search",
                            def: makeEndpoint({
                                request: { method: "GET", path: "/v1/search" },
                            }),
                        }],
                        makeProvider({ request: { baseUrl } }),
                    ),
                    OPTS,
                ),
            Error,
            "must not contain a query string or fragment",
        );
    }
});

Deno.test("no baseUrl anywhere fails compilation", async () => {
    await assertRejects(
        () =>
            compileBundle(
                source(
                    [{ name: "search", def: makeEndpoint() }],
                    makeProvider({ request: {} }),
                ),
                OPTS,
            ),
        Error,
        "no baseUrl",
    );
});

Deno.test("unknown category fails compilation (closed vocabulary)", async () => {
    await assertRejects(
        () =>
            compileBundle(
                source([{
                    name: "search",
                    def: makeEndpoint({
                        meta: {
                            displayName: "D",
                            summary: "s",
                            categories: ["not-registered"],
                        },
                    }),
                }]),
                OPTS,
            ),
        Error,
        "unknown category",
    );
});

Deno.test("compile is deterministic (double compile, byte-identical)", async () => {
    const make = () =>
        compileBundle(source([{ name: "search", def: makeEndpoint() }]), OPTS);
    const [one, two] = [await make(), await make()];
    assertEquals(
        stableStringify(JSON.parse(JSON.stringify(one))),
        stableStringify(JSON.parse(JSON.stringify(two))),
    );
});

Deno.test("closure-captured fn fails compilation", async () => {
    const captured = { drop: ["oops"] };
    await assertRejects(
        () =>
            compileBundle(
                source([{
                    name: "search",
                    def: makeEndpoint({
                        output: {
                            fromResponse: ({ data, utils }) =>
                                utils.json.omit(data.output, captured.drop),
                        },
                    }),
                }]),
                OPTS,
            ),
        Error,
        "closed term",
    );
});

Deno.test("invalid provider def fails intake (uniform parseSchema error)", async () => {
    await assertRejects(
        () =>
            compileBundle(
                [{ provider: { nope: true } as never, endpoints: [] }],
                OPTS,
            ),
        Error,
        "provider def",
    );
});

// ---------------------------------------------------------------------------
// catalog readers (pure fns over the bundle — live in @shared/core)
// ---------------------------------------------------------------------------

Deno.test("catalog: listProviders / listEndpoints / listCategories / inspectEndpoint", async () => {
    const bundle = await compileBundle(
        source([{ name: "search", def: makeEndpoint() }]),
        OPTS,
    );
    assertEquals(listProviders(bundle), [{
        name: "demo",
        displayName: "Demo",
        summary: "A demo provider.",
        endpointCount: 1,
    }]);
    assertEquals(listEndpoints(bundle, { provider: "demo" }).map((e) => e.id), [
        "demo#search",
    ]);
    assertEquals(
        listEndpoints(bundle, { category: "demo-cat" }).map((e) => e.id),
        [
            "demo#search",
        ],
    );
    assertEquals(listEndpoints(bundle, { category: "web-search" }), []);
    const categories = listCategories(bundle);
    assertEquals(categories.find((c) => c.id === "demo-cat")?.endpointCount, 1);
    assertEquals(
        categories.find((c) => c.id === "web-search")?.endpointCount,
        0,
    );
    // inspect returns the doc ITSELF — it is the contract
    const inspection = inspectEndpoint(bundle, "demo#search");
    assertEquals(inspection, bundle.endpoints["demo#search"]);
    assert(inspection.input.schema.body?.properties, "body schema surfaced");
    assert(inspection.auth.credentials.properties, "credential shape surfaced");
});

Deno.test("lookup happens in the BUNDLE: sealUnit errors on unknown ids", async () => {
    // compile-everything model: there is no filtered loading — unknown
    // provider/endpoint surfaces at bundle-lookup time, not load time
    const bundle = await compileBundle(
        source([{ name: "search", def: makeEndpoint() }]),
        OPTS,
    );
    assertThrows(
        () => sealUnit(bundle, "demo#nope"),
        Error,
        "endpoint not in bundle",
    );
    assertThrows(
        () => sealUnit(bundle, "ghost#search"),
        Error,
        "endpoint not in bundle",
    );
});

// ---------------------------------------------------------------------------
// golden: the real exa connector, via the real tree loader
// ---------------------------------------------------------------------------

Deno.test("golden: compiled exa#search doc shape (zBundle round-trip)", async () => {
    const connectorsDir = join(REPO_ROOT, "connectors");
    const [connectors, leafCategories] = await Promise.all([
        loadConnectorDefs(connectorsDir),
        loadCategoryRegistry(connectorsDir),
    ]);
    const bundle = await compileBundle(connectors, { ...OPTS, leafCategories });

    // everything compiled validates against the bundle schema — via JSON round-trip
    const reparsed = zBundle.parse(JSON.parse(JSON.stringify(bundle)));
    assertEquals(
        stableStringify(JSON.parse(JSON.stringify(reparsed))),
        stableStringify(JSON.parse(JSON.stringify(bundle))),
    );

    const doc = bundle.endpoints["exa#search"];
    assert(doc, "exa#search compiled");
    assertEquals(doc.provider, "exa");
    assertEquals(doc.minEngineVersion, "0.1.0");
    assertEquals(doc.request, {
        method: "POST",
        url: "https://api.exa.ai/search",
    });
    assertEquals(doc.auth.credentials, {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: { apiKey: { type: "string", minLength: 1 } },
        required: ["apiKey"],
    });
    assert(doc.input.schema.body?.properties, "input body schema compiled");
    // stream is NOT exposed to callers
    assert(
        !("stream" in
            (doc.input.schema.body.properties as Record<string, unknown>)),
        "stream must not appear in the compiled input schema",
    );
    assert(doc.input.toRequest?.$fn.key.startsWith("sha256:"));
    assertEquals(doc.output.fromResponse, undefined);
    assert(doc.usage.consolidate.$fn.key.startsWith("sha256:"));
    assertEquals(doc.timeouts, { requestMs: 30_000, runMs: 30_000 });
    // meta roles: one-line summary + full description
    assert(doc.meta.summary.length < 200);
    assert((doc.meta.description ?? "").includes("search types"));

    // preset entries are factory entries with presets provenance; ad-hoc fns stay "fn"
    const authEntry = bundle.fnTable[doc.auth.inject.$fn.key];
    assertEquals(authEntry.kind, "factory");
    assertEquals(authEntry.provenance, "presets#auth.header");
    assertEquals(bundle.fnTable[doc.usage.consolidate.$fn.key].kind, "fn");
    // every entry declares its ABI floor
    assertEquals(authEntry.api, "0.1.0");

    // interning across endpoints: contents shares the settle fn + auth
    const contents = bundle.endpoints["exa#contents"];
    assertEquals(
        contents.usage.consolidate.$fn.key,
        doc.usage.consolidate.$fn.key,
    );
    assertEquals(contents.auth.inject.$fn.key, doc.auth.inject.$fn.key);

    // taxonomy membership from the real registry (whole-repo compile —
    // other connectors share these leaves, so assert inclusion, not equality)
    assert(bundle.taxonomy.membership["web-search"].includes("exa#search"));
    assert(bundle.taxonomy.membership["web-scraping"].includes("exa#contents"));
});
