import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Context.dev's PUBLISHED draw per endpoint — https://www.context.dev/pricing
 * (checked 2026-09-17) — as the happy fixture of each endpoint settles it
 * (the vendor's `credits_consumed` claim equals the fold on every happy
 * chain, so no `mismatch` key appears; zUsage is strict and deep-equality
 * proves it). Written as LITERALS on purpose (clay D7a): deriving them from
 * each doc's own model would make this test a tautology. A new endpoint
 * must state its row here.
 */
const RATE: Record<
    string,
    { input: RunInput; usage: Record<string, unknown> }
> = {
    "contextdev#web/scrape/markdown": {
        input: { queryParams: { url: "https://example.com" } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/scrape/html": {
        input: { queryParams: { url: "https://example.com" } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/scrape/images": {
        input: { queryParams: { url: "https://example.com", dedupe: true } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/scrape/sitemap": {
        input: { queryParams: { domain: "example.com", maxLinks: 2 } },
        usage: {
            credits: { default: 1 },
            evidence: { search_surcharge: 0, crawl: 1 },
        },
    },
    "contextdev#web/crawl": {
        input: { body: { url: "https://example.com", maxPages: 5 } },
        usage: { credits: { default: 3 }, evidence: { PAGE: 3 } },
    },
    "contextdev#web/search": {
        input: { body: { query: "context dev api", numResults: 10 } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 2 } },
    },
    "contextdev#web/extract": {
        input: {
            body: {
                url: "https://example.com",
                schema: {
                    type: "object",
                    properties: { title: { type: "string" } },
                },
            },
        },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#brand/retrieve": {
        input: { body: { type: "by_domain", domain: "stripe.com" } },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#brand/search": {
        input: { queryParams: { query: "nike", queryBy: ["name", "domain"] } },
        usage: { credits: {}, evidence: {} },
    },
    "contextdev#utility/prefetch": {
        input: {
            body: { type: "brand", identifier: { domain: "stripe.com" } },
        },
        usage: { credits: {}, evidence: {} },
    },
    "contextdev#people/enrich": {
        input: {
            body: {
                name: { first: "Patrick", last: "Collison" },
                company: { domain: "stripe.com" },
            },
        },
        usage: { credits: { default: 20 }, evidence: { RESULT: 1 } },
    },
    "contextdev#news/search": {
        input: {
            body: {
                searchBy: {
                    type: "entity",
                    entity: { type: "domain", domain: "stripe.com" },
                },
                limit: 10,
            },
        },
        usage: { credits: { default: 1 }, evidence: { RESULT: 3 } },
    },
    "contextdev#web/naics": {
        input: { queryParams: { input: "stripe.com", maxResults: 2 } },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/sic": {
        input: { queryParams: { input: "stripe.com", type: "latest_sec" } },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/screenshot": {
        input: { queryParams: { domain: "example.com", colorScheme: "dark" } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/fonts": {
        input: { queryParams: { domain: "example.com" } },
        usage: { credits: { default: 5 }, evidence: { CALL: 1 } },
    },
    "contextdev#web/styleguide": {
        input: {
            queryParams: { domain: "example.com", colorScheme: "light" },
        },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#brand/ai/product": {
        input: { body: { url: "https://shop.example.com/products/widget" } },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
    "contextdev#brand/ai/products": {
        input: { body: { domain: "shop.example.com", maxProducts: 2 } },
        usage: { credits: { default: 10 }, evidence: { CALL: 1 } },
    },
};

/** Fixture dir: `endpoints/<wire path, slashes as dashes>/fixtures/`. */
const happyFixture = (id: string) =>
    loadFixture(
        `${HERE}endpoints/${
            id.split("#")[1].replaceAll("/", "-")
        }/fixtures/synthetic-happy.json`,
    );

const contextdevIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("contextdev#"))
        .sort();
};

Deno.test("contextdev: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await contextdevIds();
    assertEquals(ids.length, 19);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("contextdev: every endpoint's happy run settles its published draw and drops key_metadata", async () => {
    for (const [id, { input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const fixture = await happyFixture(id);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        // the billing envelope (our balance included) never reaches the
        // caller, on any endpoint
        assertEquals(
            "key_metadata" in (result.output as Record<string, Json>),
            false,
            id,
        );
    }
});

Deno.test("contextdev: an endpoint that takes timeoutOpts outlives the vendor's 300s deadline", async () => {
    const bundle = await testBundle();
    const short = (await contextdevIds()).filter((id) => {
        const { input, timeouts } = bundle.endpoints[id];
        return JSON.stringify(input.schema).includes('"timeoutOpts"') &&
            Math.min(timeouts.requestMs, timeouts.runMs) <= 300_000;
    });
    assertEquals(short, []);
});

Deno.test("contextdev: a body without the envelope settles the derived fold", async () => {
    const id = "contextdev#web/scrape/markdown";
    const unit = await testSealedUnit(id);
    const fixture = await happyFixture(id);
    delete (fixture.calls[0].res.body as Record<string, Json>).key_metadata;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    // no claim at all: the model's flat credit is the bill (D27)
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test("contextdev: usage fn provenance — one auth, one consolidate, one fromError, four own evidence fns", async () => {
    const bundle = await testBundle();
    const ids = await contextdevIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        // the vendor meter is a PROVIDER-wide fact (where key_metadata
        // lives) — ONE consolidate key across all nineteen, and one
        // error digest
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
    }
    // the metered docs own their evidence (no uniform envelope to count
    // from — design D5); everything flat or free is compiler-synthesized
    const own = ids.filter((id) =>
        bundle.fnTable[bundle.endpoints[id].usage.evidence.$fn.key]
            .provenance !== "core#usage.synthesizedEmpty"
    );
    assertEquals(own.sort(), [
        "contextdev#news/search",
        "contextdev#people/enrich",
        "contextdev#web/crawl",
        "contextdev#web/scrape/sitemap",
        "contextdev#web/search",
    ]);
    // the one output reshaping is brand search's logo strip
    const reshaped = ids.filter((id) =>
        bundle.endpoints[id].output.fromResponse !== undefined
    );
    assertEquals(reshaped, ["contextdev#brand/search"]);
});
