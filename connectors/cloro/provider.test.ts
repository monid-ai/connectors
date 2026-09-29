import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, RunKind } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ANSWER = fromFileUrl(
    new URL("./fixtures/synthetic-answer.json", import.meta.url),
);
const UNAUTHORIZED = fromFileUrl(
    new URL("./fixtures/synthetic-unauthorized.json", import.meta.url),
);
const METER = "x-credits-charged";

async function run(
    id: string,
    body: Record<string, Json>,
    headers: Record<string, string> = {},
) {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(ANSWER);
    fixture.calls[0].res.headers = headers;
    return runEndpoint({ unit, input: { body }, mode: "replay", fixture });
}

const CHATGPT = "cloro#monitor/chatgpt";
const CHATGPT_BODY = {
    prompt: "What is Example Corp?",
    country: "US",
    include: { shopping: true, ads: true },
    state: "CA",
};

Deno.test("cloro billing: the X-Credits-Charged claim settles the bill", async () => {
    const result = await run(CHATGPT, CHATGPT_BODY, { [METER]: "11" });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 7 base + 2 raw data (shopping and ads share one add-on) + 2 state
    assertEquals(result.usage, {
        credits: { default: 11 },
        evidence: { call: 1, raw_data: 1, state_targeting: 1 },
    });
});

Deno.test("cloro billing: a claim that differs from the card wins, the card rides as mismatch", async () => {
    // a per-organization credit override on cloro's side
    const result = await run(CHATGPT, CHATGPT_BODY, { [METER]: "8" });
    assertEquals(result.usage, {
        credits: { default: 8 },
        evidence: { call: 1, raw_data: 1, state_targeting: 1 },
        mismatch: { derived: { default: 11 } },
    });
});

Deno.test("cloro billing: missing or malformed meters fall back to the card", async () => {
    for (
        const headers of <Record<string, string>[]> [
            {},
            { [METER]: "" },
            { [METER]: "-1" },
            { [METER]: "1e2" },
            { [METER]: "NaN" },
            { [METER]: "9007199254740992" },
        ]
    ) {
        const result = await run(CHATGPT, CHATGPT_BODY, headers);
        assertEquals(result.usage, {
            credits: { default: 11 },
            evidence: { call: 1, raw_data: 1, state_targeting: 1 },
        }, JSON.stringify(headers));
    }
});

Deno.test("cloro billing: provider errors settle zero and are digested", async () => {
    const unit = await testSealedUnit(CHATGPT);
    const fixture = await loadFixture(UNAUTHORIZED);
    fixture.calls[0].res.headers = { [METER]: "7" };
    const result = await runEndpoint({
        unit,
        input: { body: { prompt: "anything", country: "US" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Invalid or expired API key",
        code: "INVALID_OR_EXPIRED_API_KEY",
        raw: fixture.calls[0].res.body,
    });
});

// The card, per endpoint, with no meter header. Rate card:
// https://cloro.dev/docs/guides/providers (checked 2026-09-21).
const cards: {
    id: string;
    body: Record<string, Json>;
    credits: number;
    evidence: Record<string, number>;
}[] = [
    {
        id: CHATGPT,
        body: { prompt: "p", country: "US" },
        credits: 7,
        evidence: { call: 1 },
    },
    {
        id: CHATGPT,
        body: { prompt: "p", country: "US", include: { markdown: true } },
        credits: 7,
        evidence: { call: 1 },
    },
    ...["gemini", "perplexity"].map((engine) => ({
        id: `cloro#monitor/${engine}`,
        body: { prompt: "p", country: "US", state: "NY" },
        credits: 8,
        evidence: { call: 1, state_targeting: 1 },
    })),
    {
        id: "cloro#monitor/copilot",
        body: { prompt: "p", country: "US" },
        credits: 7,
        evidence: { call: 1 },
    },
    {
        id: "cloro#monitor/google",
        body: { query: "q", country: "US" },
        credits: 5,
        evidence: { call: 1 },
    },
    {
        id: "cloro#monitor/google",
        body: {
            query: "q",
            country: "US",
            pages: 3,
            include: { aioverview: {} },
        },
        credits: 11,
        evidence: { call: 1, extra_page: 2, ai_overview: 1 },
    },
    {
        // url shape: num=30 is three pages; paaAioverview is the add-on
        id: "cloro#monitor/google",
        body: {
            url: "https://www.google.com/search?q=laptops&num=30",
            include: { paaAioverview: true },
        },
        credits: 11,
        evidence: { call: 1, extra_page: 2, ai_overview: 1 },
    },
    {
        // num is read from the query string, never from the fragment
        id: "cloro#monitor/google",
        body: { url: "https://www.google.com/search?q=laptops#x&num=100" },
        credits: 5,
        evidence: { call: 1 },
    },
    {
        // num above 100 caps at 10 pages
        id: "cloro#monitor/google",
        body: { url: "https://www.google.com/search?q=laptops&num=250" },
        credits: 23,
        evidence: { call: 1, extra_page: 9 },
    },
    {
        id: "cloro#monitor/google/news",
        body: { query: "q", country: "US" },
        credits: 5,
        evidence: { call: 1 },
    },
    {
        id: "cloro#monitor/google/news",
        body: { query: "q", gl: "us", pages: 2 },
        credits: 7,
        evidence: { call: 1, extra_page: 1 },
    },
    {
        // productResults in the body are not charged without the flag
        id: "cloro#monitor/aimode",
        body: { prompt: "p", country: "US" },
        credits: 6,
        evidence: { call: 1 },
    },
    {
        id: "cloro#monitor/aimode",
        body: { prompt: "p", country: "US", include: { expandProducts: true } },
        credits: 9,
        evidence: { call: 1, expanded_product: 3 },
    },
];

for (const card of cards) {
    Deno.test(`cloro card: ${card.id} ${JSON.stringify(card.body)}`, async () => {
        const result = await run(card.id, card.body);
        assertEquals(result.usage, {
            credits: { default: card.credits },
            evidence: card.evidence,
        });
    });
}

Deno.test("cloro estimates: holds match the card before the run", async () => {
    const estimate = async (id: string, body: Record<string, Json>) =>
        (await estimateEndpoint(await testSealedUnit(id), { body })).credits;
    assertEquals(await estimate(CHATGPT, CHATGPT_BODY), { default: 11 });
    assertEquals(
        await estimate("cloro#monitor/google", {
            query: "q",
            country: "US",
            pages: 4,
            include: { aioverview: { markdown: true } },
        }),
        { default: 13 },
    );
    assertEquals(
        await estimate("cloro#monitor/google/news", {
            query: "q",
            country: "US",
        }),
        { default: 5 },
    );
    // the hold covers cloro's documented maximum of 6 expanded clusters
    assertEquals(
        await estimate("cloro#monitor/aimode", {
            prompt: "p",
            country: "US",
            include: { expandProducts: true },
        }),
        { default: 12 },
    );
});

Deno.test("cloro input: bodies are strict, like the vendor's", async () => {
    await assertRejects(
        () => run(CHATGPT, { prompt: "p", country: "US", unknown: true }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () => run(CHATGPT, { prompt: "p", country: "US", state: "ca" }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () => run(CHATGPT, { prompt: "p", country: "" }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("cloro input: localization is required before the wire", async () => {
    for (
        const [id, body] of <[string, Record<string, Json>][]> [
            ["cloro#monitor/aimode", { prompt: "p" }],
            ["cloro#monitor/google/news", { query: "q" }],
            ["cloro#monitor/google", { query: "q" }],
            ["cloro#monitor/google", { country: "US" }],
        ]
    ) {
        await assertRejects(
            () => run(id, body),
            Error,
            "INVALID_INPUT",
            `${id} ${JSON.stringify(body)}`,
        );
    }
    for (
        const [id, body] of <[string, Record<string, Json>][]> [
            ["cloro#monitor/aimode", { prompt: "p", gl: "us" }],
            ["cloro#monitor/google/news", { query: "q", gl: "us" }],
            ["cloro#monitor/google", { query: "q", gl: "us" }],
            ["cloro#monitor/google", {
                url: "https://www.google.com/search?q=x",
            }],
        ]
    ) {
        const result = await run(id, body);
        assertEquals(result.isProviderError, false);
    }
});

// Run mode by measured latency (2026-09-22 drill, 2026-09-23 run): the
// fast engines stay sync, the slow assistants run async on monid's side.
const SYNC = ["google", "google/news", "aimode"];
const ASYNC = ["chatgpt", "gemini", "copilot", "perplexity"];

Deno.test("cloro: every endpoint shares the meter relay, the claim and the error digest", async () => {
    const bundle = await testBundle();
    const docs = Object.values(bundle.endpoints).filter((doc) =>
        doc.id.startsWith("cloro#")
    );
    assertEquals(docs.length, 7);
    const keys = (pick: (doc: typeof docs[number]) => unknown) =>
        new Set(docs.map(pick)).size;
    const doc = (engine: string) => bundle.endpoints[`cloro#monitor/${engine}`];
    const relay = doc("google").lifecycle?.start?.$fn.key;
    for (const engine of SYNC) {
        // the provider relay makes the call in start; nothing to poll
        assertEquals(doc(engine).lifecycle?.start?.$fn.key, relay, engine);
        assertEquals(doc(engine).lifecycle?.poll, undefined, engine);
    }
    const ack = doc("chatgpt").lifecycle?.start?.$fn.key;
    for (const engine of ASYNC) {
        // start acknowledges, the poll is the same relay
        assertEquals(doc(engine).lifecycle?.start?.$fn.key, ack, engine);
        assertEquals(doc(engine).lifecycle?.poll?.$fn.key, relay, engine);
    }
    assertEquals(keys((doc) => doc.usage.consolidate?.$fn.key), 1);
    assertEquals(keys((doc) => doc.output?.fromError?.$fn.key), 1);
    // the three assistant engines without add-ons intern to one estimate
    const plain = docs.filter((doc) =>
        ["gemini", "copilot", "perplexity"].some((engine) =>
            doc.id === `cloro#monitor/${engine}`
        )
    );
    assertEquals(
        new Set(plain.map((doc) => doc.usage.estimate.$fn.key)).size,
        1,
    );
});

Deno.test("cloro run mode: an async engine is acknowledged, then one poll makes the call", async () => {
    const input = { body: CHATGPT_BODY };
    const fixture = await loadFixture(ANSWER);
    fixture.calls[0].res.headers = { [METER]: "11" };
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(CHATGPT),
        input,
        mode: "replay",
        fixture,
    });
    // start does no IO: the chain's one call is still unused after it
    const started = await loaded.start(input);
    assert(started.kind === RunKind.RUNNING, "start acknowledges the run");
    const polled = await loaded.poll(input, started.state);
    assert(polled.kind === RunKind.COMPLETED, "one poll completes it");
    assertEquals(polled.httpStatus, 200);
    assertEquals(polled.usage.credits, { default: 11 });
});

Deno.test({
    name: "cloro#monitor/google live (gated on CLORO_API_KEY)",
    ignore: liveSkip("cloro"),
    fn: async () => {
        const unit = await testSealedUnit("cloro#monitor/google");
        const result = await runEndpoint({
            unit,
            input: {
                body: { query: "project management software", country: "US" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { call: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
    },
});

// Real recordings (2026-09-21): the vendor claim equals the card.
for (
    const recorded of <{
        id: string;
        file: string;
        body: Record<string, Json>;
        credits: number;
    }[]> [
        {
            id: "cloro#monitor/google",
            file: "./endpoints/google/fixtures/recorded-google.json",
            body: { query: "project management software", country: "US" },
            credits: 5,
        },
        {
            id: CHATGPT,
            file: "./endpoints/chatgpt/fixtures/recorded-chatgpt.json",
            body: {
                prompt:
                    "What is the best project management software for small teams?",
                country: "US",
            },
            credits: 7,
        },
    ]
) {
    Deno.test(`cloro recorded: ${recorded.id} settles on the recorded header`, async () => {
        const unit = await testSealedUnit(recorded.id);
        const fixture = await loadFixture(
            fromFileUrl(new URL(recorded.file, import.meta.url)),
        );
        assertEquals(
            fixture.calls[0].res.headers?.[METER],
            String(recorded.credits),
        );
        const result = await runEndpoint({
            unit,
            input: { body: recorded.body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: recorded.credits },
            evidence: { call: 1 },
        });
    });
}
