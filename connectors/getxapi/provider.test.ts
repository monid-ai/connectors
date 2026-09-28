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
 * THE getxapi suite (the litescrape layout): 25 docs of ONE shape, a
 * synchronous GET billed as a flat `PER_CALL` line in US dollars, so the
 * tests live once here and iterate the catalog, while every endpoint keeps
 * its own recorded fixtures under `endpoints/<folder>/fixtures/` (replay
 * matches the exact wire URL). Every fixture is a LIVE recording from
 * 2026-09-23, trimmed and scrubbed by `deno task record`.
 *
 * GetXAPI declares no `usage.consolidate`: no response carries a meter, so
 * the derived fold is the settled answer on every run and no `mismatch` key
 * can appear. The rate table below is the only thing between a typo and a
 * wrong bill.
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

/** Fixture dir: `endpoints/<wire path, slashes and underscores as dashes>/`. */
const fixtureFor = (id: string, name: string) =>
    loadFixture(
        `${HERE}endpoints/${
            id.split("#")[1].replaceAll("/", "-").replaceAll("_", "-")
        }/fixtures/${name}.json`,
    );

const getxapiIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("getxapi#"))
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
 * GetXAPI's price per call in US dollars, from https://www.getxapi.com/pricing
 * and each operation's description in https://docs.getxapi.com/openapi.json
 * (read 2026-09-23). Written as LITERALS on purpose: deriving them from each
 * doc's own model would make this test a tautology. A new endpoint must
 * state its row here.
 */
const RATE: Record<string, number> = {
    "getxapi#community/info": 0.001,
    "getxapi#list/members": 0.001,
    "getxapi#spaces/info": 0.001,
    "getxapi#trends": 0.001,
    "getxapi#trends/locations": 0.001,
    "getxapi#tweet/advanced_search": 0.001,
    "getxapi#tweet/detail": 0.001,
    "getxapi#tweet/replies": 0.001,
    "getxapi#tweet/retweeters": 0.001,
    "getxapi#tweet/thread": 0.005,
    "getxapi#user/affiliates": 0.001,
    "getxapi#user/followers": 0.001,
    "getxapi#user/followers_v2": 0.001,
    "getxapi#user/following_v2": 0.001,
    "getxapi#user/info": 0.001,
    "getxapi#user/info_by_id": 0.001,
    "getxapi#user/media": 0.001,
    "getxapi#user/mentions": 0.001,
    "getxapi#user/search": 0.001,
    "getxapi#user/status": 0.001,
    "getxapi#user/tweets": 0.001,
    "getxapi#user/tweets/complete": 0.003,
    "getxapi#user/tweets_and_replies": 0.001,
    "getxapi#user/user_about": 0.001,
    "getxapi#user/verified_followers": 0.001,
};

// ---------------------------------------------------------------------------
// the catalog
// ---------------------------------------------------------------------------

Deno.test("getxapi docs: every endpoint is in the rate table", async () => {
    const ids = await getxapiIds();
    assertEquals(ids.length, 25);
    assertEquals(Object.keys(RATE).sort(), ids);
});

Deno.test("getxapi docs: one auth, one error digest, flat dollar lines, no consolidate, verbatim output", async () => {
    const bundle = await testBundle();
    const ids = await getxapiIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            bundle.fnTable[doc.auth.inject.$fn.key].provenance,
            "presets#auth.bearer",
            id,
        );
        assert(doc.output.fromError, `${id}: the error digest must run`);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        // the vendor body, `next_cursor` included, reaches the caller as is
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
        // no response carries a meter
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.usage.model.kind, "PER_CALL", id);
        assertEquals(
            (doc.usage.model as { consumes: Json }).consumes,
            { credit: "default", amount: RATE[id] },
            id,
        );
        assertEquals(
            doc.usage.credits,
            { default: { label: "US dollars" } },
            id,
        );
        assertEquals(doc.lifecycle, undefined, id);
        assertEquals(doc.timeouts, { requestMs: 30_000, runMs: 30_000 }, id);
        // the `/twitter` prefix rides the base URL; the id is the vendor path
        assertEquals(
            doc.request.url,
            `https://api.getxapi.com/twitter/${id.split("#")[1]}`,
            id,
        );
        assertEquals(doc.request.method, "GET", id);
        assert(
            doc.meta.docsUrl?.startsWith("https://docs.getxapi.com/docs/"),
            id,
        );
        assertEquals(doc.meta.categories, ["twitter"], id);
    }
});

Deno.test("getxapi meta: the provider's notes reach every doc, and no text carries a dash", async () => {
    const bundle = await testBundle();
    for (const id of await getxapiIds()) {
        const meta = bundle.endpoints[id].meta;
        const notes = (meta.notes ?? []).join(" ");
        assert(notes.includes("`next_cursor` back as `cursor`"), id);
        assert(notes.includes("Every HTTP 200 is billed"), id);
        const text = JSON.stringify(meta);
        // the en and em dash, by code point so this file carries neither
        const dashes = [
            String.fromCharCode(0x2013),
            String.fromCharCode(0x2014),
        ];
        assertEquals(
            dashes.some((dash) => text.includes(dash)),
            false,
            `${id}: dash`,
        );
        // the text discover ranks: a real paragraph, not a one-liner
        assert(
            (meta.description ?? "").length > 120,
            `${id}: description too thin`,
        );
    }
});

// ---------------------------------------------------------------------------
// the 25 relays
// ---------------------------------------------------------------------------

Deno.test("getxapi: every endpoint's recorded happy run bills its flat price and relays the body verbatim", async () => {
    for (const id of await getxapiIds()) {
        const fixture = await fixtureFor(id, "happy");
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
            evidence: { CALL: 1 },
        }, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("getxapi: a 404 is data, zero usage, the vendor message lifted to the top", async () => {
    for (
        const [id, input, message] of [
            [
                "getxapi#user/info",
                { queryParams: { userName: "thisuserdoesnotexist_zz9q" } },
                "Could not find user @thisuserdoesnotexist_zz9q",
            ],
            [
                "getxapi#tweet/detail",
                { queryParams: { id: "1" } },
                "Tweet not found: 1",
            ],
        ] as const
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: await fixtureFor(id, "not-found"),
        });
        assertEquals(result.httpStatus, 404, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as { message: string; raw: Json };
        assertEquals(output.message, message, id);
        assertEquals(output.raw, { error: message }, id);
    }
});

Deno.test("getxapi: a 401 is data and bills nothing", async () => {
    const id = "getxapi#user/info";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await fixtureFor(id, "unauthorized"),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Invalid API key",
    );
});

Deno.test("getxapi: user/status answers a missing account with a billed 200", async () => {
    const id = "getxapi#user/status";
    const fixture = await fixtureFor(id, "not-found");
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: { queryParams: { userName: "thisuserdoesnotexist_zz9q" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { CALL: 1 },
    });
    assertEquals(
        (result.output as { data: { status: string } }).data.status,
        "not_found",
    );
});

// ---------------------------------------------------------------------------
// the gates
// ---------------------------------------------------------------------------

Deno.test("getxapi: every input schema is strict, and every test input passes it", async () => {
    for (const id of await getxapiIds()) {
        const input = (inputFor(id).queryParams ?? {}) as Record<string, Json>;
        await rejects(id, { ...input, not_a_getxapi_param: "1" });
        await validates(id, input);
    }
});

Deno.test("getxapi gates: usernames, numeric ids, the userName or userId pair, and the trends cap", async () => {
    // usernames go without the @, ids are decimal strings
    await rejects("getxapi#user/info", { userName: "@NASA" });
    await rejects("getxapi#user/info", { userName: "" });
    await validates("getxapi#user/info", { userName: "NASA_2" });
    await rejects("getxapi#tweet/detail", { id: "not-a-number" });
    await rejects("getxapi#user/info_by_id", { userId: "11348282x" });
    await validates("getxapi#user/info_by_id", { userId: "11348282" });
    // user/tweets takes exactly one of userName or userId
    await validates("getxapi#user/tweets", { userId: "11348282" });
    await rejects("getxapi#user/tweets", {});
    await rejects("getxapi#user/tweets", {
        userName: "NASA",
        userId: "11348282",
    });
    // an empty cursor is never valid; a real one is passed back unchanged
    await rejects("getxapi#user/followers", { userName: "NASA", cursor: "" });
    // trends: X returns at most 50
    await rejects("getxapi#trends", { count: 51 });
    await rejects("getxapi#trends", { count: 0 });
    await validates("getxapi#trends", { woeid: "23424977", count: 50 });
    await validates("getxapi#trends", {});
    // search: product is a closed set
    await rejects("getxapi#tweet/advanced_search", {
        q: "nasa",
        product: "Photos",
    });
    await rejects("getxapi#tweet/advanced_search", { product: "Top" });
});

// ---------------------------------------------------------------------------
// live (skipped without GETXAPI_CREDENTIALS_API_KEY)
// ---------------------------------------------------------------------------

Deno.test({
    name: "getxapi live: a profile lookup settles one flat call",
    ignore: liveSkip("getxapi"),
    fn: async () => {
        const id = "getxapi#user/info";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: pin the pool settled and the profile returned
        assertEquals(typeof result.usage.credits.default, "number");
        const data = (result.output as { data: { id: string } }).data;
        assertEquals(typeof data.id, "string");
    },
});
