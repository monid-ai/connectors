import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const T = { ticker: "NVDA" };

/**
 * Every ported endpoint, its credit class, the input its recording was made
 * with, and that recording. SentiSense charges 1 (lookup), 2 (analytics) or
 * 4 (alternative data) credits per successful call and reports no
 * per-response meter, so each row settles at exactly its class from the
 * derived fold, with no claim and no `mismatch`. Written as literals so a
 * class drift fails here.
 */
const ENDPOINTS: Record<
    string,
    { fixture: string; credits: 1 | 2 | 4; input: RunInput }
> = {
    "sentisense#v1/stocks/{ticker}/sentiment": {
        fixture: "stock-sentiment-ok",
        credits: 2,
        input: { pathParams: T },
    },
    "sentisense#v1/rating/{ticker}": {
        fixture: "rating-ok",
        credits: 2,
        input: { pathParams: T },
    },
    "sentisense#v1/stocks/{ticker}/options/summary": {
        fixture: "options-summary-ok",
        credits: 4,
        input: { pathParams: T },
    },
    "sentisense#v1/insider/trades/{ticker}": {
        fixture: "insider-trades-ok",
        credits: 2,
        input: { pathParams: T, queryParams: { lookbackDays: 30 } },
    },
    "sentisense#v1/insider/cluster-buys": {
        fixture: "insider-cluster-buys-ok",
        credits: 4,
        input: { queryParams: { lookbackDays: 30 } },
    },
    "sentisense#v1/politicians/filings/{ticker}": {
        fixture: "congress-trades-ok",
        credits: 4,
        input: { pathParams: T, queryParams: { lookbackDays: 90 } },
    },
    "sentisense#v1/institutional/holders/{ticker}": {
        fixture: "institutional-holders-ok",
        credits: 2,
        input: { pathParams: T, queryParams: { limit: 3 } },
    },
    "sentisense#v2/market-mood": {
        fixture: "market-mood-ok",
        credits: 1,
        input: { queryParams: { days: 3 } },
    },
    "sentisense#v1/documents/stories/ticker/{ticker}": {
        fixture: "stories-by-ticker-ok",
        credits: 2,
        input: { pathParams: T, queryParams: { limit: 2 } },
    },
    "sentisense#v1/documents/stories/search": {
        fixture: "stories-search-ok",
        credits: 2,
        input: { queryParams: { query: "fed decision", limit: 2 } },
    },
    "sentisense#v1/kb/entities/search": {
        fixture: "entity-search-ok",
        credits: 1,
        input: { queryParams: { q: "nvidia", limit: 3 } },
    },
};

const charged = (credits: number) => ({
    credits: { default: credits },
    evidence: { CALL: 1 },
});
const ZERO = { credits: {}, evidence: {} };

for (const [id, { fixture, credits, input }] of Object.entries(ENDPOINTS)) {
    Deno.test(`${id} happy: ${credits} credit(s), body passed through untouched`, async () => {
        const recorded = await loadFixture(`${FIXTURES}${fixture}.json`);
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: recorded,
        });

        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, charged(credits));
        // no consolidate and no fromResponse: what the API sent is what
        // the caller gets, preview envelope included
        assertEquals(result.output, recorded.calls[0].res.body);
    });

    Deno.test(`${id} provider error: a 401 is data and bills nothing`, async () => {
        // the recorded 401 response, replayed against this endpoint's own
        // recorded request (the replay matcher compares the substituted url)
        const recorded = await loadFixture(`${FIXTURES}${fixture}.json`);
        const denied = await loadFixture(`${FIXTURES}unauthorized.json`);
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: {
                ...denied,
                calls: [{
                    req: recorded.calls[0].req,
                    res: denied.calls[0].res,
                }],
            },
        });

        assertEquals(result.httpStatus, 401);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, ZERO);
        assertEquals(result.output, {
            message: "Invalid or revoked API key",
            code: "invalid_api_key",
            raw: {
                error: "invalid_api_key",
                message: "Invalid or revoked API key",
            },
        });
    });
}

Deno.test("sentisense unknown ticker: 404 entity_not_found settles at zero, suggestions lifted", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("sentisense#v1/rating/{ticker}"),
        input: { pathParams: { ticker: "ZZZZQ" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}not-found.json`),
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    const output = result.output as Record<string, Json>;
    assertEquals(output.code, "entity_not_found");
    // the caller's next move rides beside the message
    assertEquals(output.suggestions, []);
    assert(typeof output.message === "string" && output.message !== "");
});

Deno.test("sentisense: every endpoint is a GET on one base url, in its credit class, sharing auth and error digest", async () => {
    const bundle = await testBundle();
    const docs = Object.values(bundle.endpoints).filter((doc) =>
        doc.id.startsWith("sentisense#")
    );
    assertEquals(
        docs.map((doc) => doc.id).sort(),
        Object.keys(ENDPOINTS).sort(),
    );
    for (const doc of docs) {
        assertEquals(doc.request.method, "GET", doc.id);
        assert(
            doc.request.url.startsWith("https://app.sentisense.ai/api/v"),
            doc.id,
        );
        assertEquals(doc.usage.model, {
            kind: "PER_CALL",
            consumes: { credit: "default", amount: ENDPOINTS[doc.id].credits },
        }, doc.id);
    }
    const keys = (pick: (doc: typeof docs[number]) => unknown) =>
        new Set(docs.map(pick)).size;
    assertEquals(keys((doc) => doc.output?.fromError?.$fn.key), 1);
    assertEquals(keys((doc) => doc.auth.inject.$fn.key), 1);
});

const rejects = (id: string, input: RunInput) =>
    assertRejects(
        async () =>
            runEndpoint({
                unit: await testSealedUnit(id),
                input,
                mode: "replay",
                // never reached: the gate refuses before the wire
                fixture: await loadFixture(`${FIXTURES}unauthorized.json`),
            }),
        Error,
        "INVALID_INPUT",
    );

Deno.test("sentisense input: lookbackDays is held to the API's 1..365", async () => {
    for (
        const [id, pathParams] of <[string, Record<string, string>?][]> [
            ["sentisense#v1/insider/trades/{ticker}", T],
            ["sentisense#v1/insider/cluster-buys", undefined],
            ["sentisense#v1/politicians/filings/{ticker}", T],
        ]
    ) {
        const base = pathParams ? { pathParams } : {};
        await rejects(id, { ...base, queryParams: { lookbackDays: 0 } });
        await rejects(id, { ...base, queryParams: { lookbackDays: 366 } });
        // the accepted edge, through the pure estimate (no wire call)
        assertEquals(
            await estimateEndpoint(await testSealedUnit(id), {
                ...base,
                queryParams: { lookbackDays: 365 },
            }),
            charged(ENDPOINTS[id].credits),
        );
    }
});

Deno.test("sentisense input: a misspelled param is refused instead of silently ignored", async () => {
    // the API ignores unknown query params, so `lookback` would quietly
    // answer the default 90-day window; the strict mirror refuses it
    await rejects("sentisense#v1/insider/trades/{ticker}", {
        pathParams: T,
        queryParams: { lookback: 30 },
    });
    await rejects("sentisense#v1/rating/{ticker}", {
        pathParams: { ...T, exchange: "NASDAQ" },
    });
});

Deno.test("sentisense input: enums, dates and required fields match the API's 400s", async () => {
    await rejects("sentisense#v1/kb/entities/search", {
        queryParams: { q: "n" },
    });
    await rejects("sentisense#v1/kb/entities/search", {
        queryParams: { q: "nvidia", type: "stock" },
    });
    await rejects("sentisense#v1/institutional/holders/{ticker}", {
        pathParams: T,
        queryParams: { sortBy: "value" },
    });
    await rejects("sentisense#v1/documents/stories/search", {
        queryParams: { query: "" },
    });
    await rejects("sentisense#v1/rating/{ticker}", {
        pathParams: { ticker: "" },
    });
});

Deno.test({
    name: "sentisense#v1/rating/{ticker} live (gated on SENTISENSE_API_KEY)",
    ignore: liveSkip("sentisense"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("sentisense#v1/rating/{ticker}"),
            input: { pathParams: { ticker: "AAPL" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the replay tests pin the class
        assertEquals(result.usage.evidence, { CALL: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals((result.output as Record<string, Json>).ticker, "AAPL");
    },
});
