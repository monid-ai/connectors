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
 * THE kling test suite (fixture strategy v2): eight minimal shared chains in
 * `fixtures/` exercise every endpoint of the provider. `{{request.url}}` /
 * `{{request.origin}}` bind each chain to the endpoint under test, and every
 * Kling model posts to its OWN create-task path but polls the SAME
 * `GET /tasks?task_ids=` — so one recorded chain genuinely serves all
 * twelve.
 *
 * ALL chains are SYNTHETIC (no Kling key was available on 2026-09-16); the
 * body shapes are the ones v1's 2026-09-08 drill observed and its tests
 * pin. Replace `synthetic-task-succeeded*` and `synthetic-submit-rejected`
 * with `deno task record` output once a key exists.
 *
 * The happy chain carries an EMPTY receipt so the derived fold settles, and
 * the settled SECOND COUNT is the same for every endpoint (5, off the
 * fixture's "5.041"); what differs per endpoint is the RATE, so the
 * expectations below are a LITERAL table of units — never re-derived from
 * the doc's own model, which would make the test a tautology (clay D7a).
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput["body"]>;

/** Seconds the synthetic chains settle: `outputs[].duration` "5.041". */
const CHAIN_SECONDS = 5;

/**
 * THE LITERAL RATE TABLE — units billed for the shared chain (5 s on the
 * silent 720p line every test input selects), one row per endpoint. Typed
 * by hand from https://kling.ai/document-api/pricing/base/video
 * (2026-09-16): 0.6 / 0.8 / 0.3 / 0.3 / 0.6 / 0.6 / 0.9 / 0.5 units per
 * second × 5. A new endpoint MUST add a row (the key-set assertion below).
 */
const HAPPY_UNITS: Record<string, number> = {
    "kling#text-to-video/kling-3.0": 3,
    "kling#text-to-video/kling-3.0-turbo": 4,
    "kling#text-to-video/kling-2.6": 1.5,
    "kling#text-to-video/kling-2.5-turbo": 1.5,
    "kling#image-to-video/kling-3.0": 3,
    "kling#image-to-video/kling-3.0-turbo": 4,
    "kling#image-to-video/kling-2.6": 1.5,
    "kling#image-to-video/kling-2.5-turbo": 1.5,
    "kling#omni-video/kling-3.0-omni": 3,
    "kling#omni-video/kling-o1": 3,
    "kling#motion-control/kling-3.0": 4.5,
    "kling#motion-control/kling-2.6": 2.5,
};

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("kling#"))
        .sort();
};

const inputFor = (id: string): RunInput => {
    const body = INPUTS[id.split("#")[1]];
    assert(body !== undefined, `${id}: no test input in test-inputs.json`);
    return { body };
};

/** The test input with different `settings` — flips the rate line. */
const withSettings = (id: string, settings: Record<string, Json>): RunInput => {
    const body = inputFor(id).body as Record<string, Json>;
    return {
        body: {
            ...body,
            settings: {
                ...(body.settings as Record<string, Json>),
                ...settings,
            },
        },
    };
};

Deno.test("kling: the literal rate table names exactly the metered endpoints", async () => {
    assertEquals(Object.keys(HAPPY_UNITS).sort(), await endpointIds());
});

Deno.test("kling: every endpoint completes the happy chain, folded at its OWN rate", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-succeeded.json`,
    );
    for (const id of await endpointIds()) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        // every test input selects the silent 720p line; the chain's empty
        // receipt claims nothing, so the derived fold IS the bill and no
        // mismatch can exist (zUsage is strict — the deep compare proves it)
        assertEquals(result.usage, {
            credits: { default: HAPPY_UNITS[id] },
            evidence: { "720p": CHAIN_SECONDS },
        }, id);
        // D27 strip: the receipt does not ride the payload…
        const output = result.output as Record<string, unknown>;
        assert(!("billing" in output), `${id}: billing stripped from output`);
        // …but the task the caller wants survives untouched, UNWRAPPED from
        // Kling's {code, data: [task]} batch envelope
        assertEquals(output.status, "succeeded", id);
        assertEquals(output.id, "926151964131065926", id);
        const outputs = output.outputs as Record<string, string>[];
        assert(outputs[0].url.length > 0, id);
        assertEquals(outputs[0].duration, "5.041", id);
        // engine-stamped timing: one processing poll + the terminal one
        assertEquals(result.timing.attempts, 2, id);
    }
});

Deno.test("kling: the rate line follows the REQUEST — audio, video input, resolution", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-succeeded.json`,
    );
    // Each row: endpoint, settings override, extra contents item, expected
    // evidence key, units at 5 s — literal, from the pricing page.
    const rows: [string, Record<string, Json>, Json[], string, number][] = [
        [
            "kling#text-to-video/kling-3.0",
            { audio: "native" },
            [],
            "720p_native_audio",
            4.5,
        ],
        [
            "kling#text-to-video/kling-3.0",
            { resolution: "1080p", audio: "native" },
            [],
            "1080p_native_audio",
            6,
        ],
        ["kling#text-to-video/kling-3.0", { resolution: "4k" }, [], "4k", 15],
        [
            "kling#image-to-video/kling-3.0",
            { resolution: "4k", audio: "native" },
            [],
            "4k_native_audio",
            15,
        ],
        [
            "kling#text-to-video/kling-3.0-turbo",
            { resolution: "1080p" },
            [],
            "1080p",
            5,
        ],
        [
            "kling#text-to-video/kling-2.6",
            { resolution: "1080p", audio: "native" },
            [],
            "1080p_native_audio",
            5,
        ],
        // 720p + native has no published 2.6 rate (Kling rejects it for
        // free) — the doc keys it on the silent line rather than inventing one
        ["kling#text-to-video/kling-2.6", { audio: "native" }, [], "720p", 1.5],
        [
            "kling#image-to-video/kling-2.5-turbo",
            { resolution: "1080p" },
            [],
            "1080p",
            2.5,
        ],
        [
            "kling#omni-video/kling-3.0-omni",
            { audio: "native" },
            [],
            "720p_native_audio",
            4,
        ],
        [
            "kling#omni-video/kling-3.0-omni",
            { resolution: "1080p" },
            [
                { type: "feature_video", url: "https://example.test/ref.mp4" },
            ],
            "1080p_with_video",
            6,
        ],
        // a video input wins over the audio switch (native is not offered
        // with a video; Kling rejects the pair for free)
        [
            "kling#omni-video/kling-3.0-omni",
            { audio: "native" },
            [
                { type: "base_video", url: "https://example.test/ref.mp4" },
            ],
            "720p_with_video",
            4.5,
        ],
        [
            "kling#omni-video/kling-o1",
            {},
            [
                { type: "base_video", url: "https://example.test/ref.mp4" },
            ],
            "720p_with_video",
            4.5,
        ],
        ["kling#omni-video/kling-o1", { resolution: "1080p" }, [], "1080p", 4],
        [
            "kling#motion-control/kling-3.0",
            { resolution: "1080p" },
            [],
            "1080p",
            6,
        ],
        [
            "kling#motion-control/kling-2.6",
            { resolution: "1080p", character_orientation: "image" },
            [],
            "1080p",
            4,
        ],
    ];
    for (const [id, settings, extra, key, units] of rows) {
        const input = withSettings(id, settings);
        const body = input.body as Record<string, Json>;
        if (extra.length > 0) {
            body.contents = [...(body.contents as Json[]), ...extra];
        }
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, `${id} ${key}`);
        assertEquals(result.usage, {
            credits: { default: units },
            evidence: { [key]: CHAIN_SECONDS },
        }, `${id} ${key}`);
    }
});

Deno.test("kling: a unit receipt is the vendor's claim — it wins, and the fold cross-checks it", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-succeeded-billed.json`,
    );
    // 3.0 text-to-video at 720p × 5 s IS 3 units: claim and fold agree, so
    // the public usage carries the claim and no mismatch signal.
    const agree = await runEndpoint({
        unit: await testSealedUnit("kling#text-to-video/kling-3.0"),
        input: inputFor("kling#text-to-video/kling-3.0"),
        mode: "replay",
        fixture,
    });
    assertEquals(agree.usage, {
        credits: { default: 3 },
        evidence: { "720p": CHAIN_SECONDS },
    });
    assert(!("billing" in (agree.output as Record<string, unknown>)));
    // Turbo folds 4 units for the same chain; the receipt says 3. The
    // vendor's number is the bill, OUR fold rides out as the signal
    // (design D4 / D27) — said, never hidden, never failing the run.
    const disagree = await runEndpoint({
        unit: await testSealedUnit("kling#text-to-video/kling-3.0-turbo"),
        input: inputFor("kling#text-to-video/kling-3.0-turbo"),
        mode: "replay",
        fixture,
    });
    assertEquals(disagree.httpStatus, 200);
    assertEquals(disagree.usage, {
        credits: { default: 3 },
        evidence: { "720p": CHAIN_SECONDS },
        mismatch: { derived: { default: 4 } },
    });
});

Deno.test("kling: a cash receipt is another pool — no claim, the fold settles, still stripped", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-succeeded-cash.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit("kling#text-to-video/kling-3.0-turbo"),
        input: inputFor("kling#text-to-video/kling-3.0-turbo"),
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { "720p": CHAIN_SECONDS },
    });
    assert(!("billing" in (result.output as Record<string, unknown>)));
});

Deno.test("kling: task failure → synthesized 500, zero usage, the task body as data", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-failed.json`,
    );
    const id = "kling#motion-control/kling-3.0";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500); // OURS — the TASK failed
    assertEquals(result.providerHttpStatus, 200); // THEIRS — the GET was fine
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "failed");
    // Kling puts the rule text at the top level already — no fromError
    // needed to lift it (design D11)
    assertEquals(
        output.message,
        "The uploaded video does not contain a complete upper body",
    );
});

Deno.test("kling: success with no video url → synthesized 502, zero usage", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-task-no-video-url.json`,
    );
    const id = "kling#omni-video/kling-o1";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    // The chain's task DOES carry a unit receipt: the zero-bill comes from
    // the error path (a fn cannot bill an error), not from a missing meter.
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("kling: rejected submit is DATA — vendor status, zero usage, envelope verbatim", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-submit-rejected.json`,
    );
    const id = "kling#text-to-video/kling-2.6";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: withSettings(id, { audio: "native" }),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, 1201);
    assert((output.message as string).includes("not supported when audio"));
});

Deno.test("kling: a 2xx submit with a non-zero envelope code → synthesized 502, zero usage", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-submit-envelope-error.json`,
    );
    const id = "kling#text-to-video/kling-3.0";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 502); // OURS — the envelope said error
    assertEquals(result.providerHttpStatus, 200); // THEIRS — a 200
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).code, 1102);
});

Deno.test("kling: a failing poll THROWS rather than abandoning a paid generation", async () => {
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-poll-failed.json`,
    );
    const id = "kling#text-to-video/kling-2.5-turbo";
    const unit = await testSealedUnit(id);
    // Design D7: retriable infrastructure failure, NOT a settled provider
    // error — the task is still running and still billing upstream.
    await assertRejects(
        () =>
            runEndpoint({ unit, input: inputFor(id), mode: "replay", fixture }),
        Error,
        "503",
    );
});

/** Estimates are PURE — a transport that rejects proves no IO happens. */
async function estimateFor(id: string, body: Json) {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return loaded.estimate({ body });
}

Deno.test("kling: estimates hold the requested seconds on the requested line", async () => {
    // No settings at all: the binding materializes Kling's own defaults
    // (720p, 5 s, audio off) — nested inside the prefaulted `settings`
    // object — so the hold is deducible from the input alone (D24).
    assertEquals(
        await estimateFor("kling#text-to-video/kling-3.0", { prompt: "a cat" }),
        { credits: { default: 3 }, evidence: { "720p": 5 } },
    );
    // 4K + native audio × 15 s at 3 units/s
    assertEquals(
        await estimateFor("kling#text-to-video/kling-3.0", {
            prompt: "a cat",
            settings: { resolution: "4k", audio: "native", duration: 15 },
        }),
        { credits: { default: 45 }, evidence: { "4k_native_audio": 15 } },
    );
    // a video input moves the hold to the with-video line BEFORE the run
    assertEquals(
        await estimateFor("kling#omni-video/kling-3.0-omni", {
            contents: [
                { type: "prompt", text: "make it snow" },
                { type: "base_video", url: "https://example.test/ref.mp4" },
            ],
            settings: { resolution: "1080p", duration: 10, multi_shot: false },
        }),
        { credits: { default: 12 }, evidence: { "1080p_with_video": 10 } },
    );
    // motion control has no duration: the hold is the orientation ceiling
    // (10 s for image, 30 s for video), released at settle
    const dancer = [
        { type: "image", url: "https://example.test/dancer.png" },
        { type: "video", url: "https://example.test/dance.mp4" },
    ];
    assertEquals(
        await estimateFor("kling#motion-control/kling-3.0", {
            contents: dancer,
            settings: { character_orientation: "image", resolution: "1080p" },
        }),
        { credits: { default: 12 }, evidence: { "1080p": 10 } },
    );
    assertEquals(
        await estimateFor("kling#motion-control/kling-2.6", {
            contents: dancer,
            settings: { character_orientation: "video" },
        }),
        { credits: { default: 15 }, evidence: { "720p": 30 } },
    );
});

Deno.test("kling: the input schema rejects before the wire", async () => {
    const rejects = async (id: string, body: Json, why: string) => {
        await assertRejects(
            () => estimateFor(id, body),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    const t2v = "kling#text-to-video/kling-2.6";
    // `.strict()` survives compilation — v1's excluded knobs stay excluded
    await rejects(t2v, { prompt: "a cat", seed: 42 }, "unknown key");
    await rejects(t2v, {
        prompt: "a cat",
        options: { callback_url: "https://example.test/cb" },
    }, "options is not exposed");
    // a resolution 2.6 does not serve (and has no rate line for)
    await rejects(t2v, {
        prompt: "a cat",
        settings: { resolution: "4k" },
    }, "unserved resolution");
    // 2.6 is a 5 | 10 choice, compiled as an enum, not a range
    await rejects(t2v, {
        prompt: "a cat",
        settings: { duration: 7 },
    }, "duration outside the 5 | 10 choice");
    // …while the 3.0 range accepts its edges and rejects past them
    const t2v30 = "kling#text-to-video/kling-3.0";
    assertEquals(
        (await estimateFor(t2v30, {
            prompt: "a cat",
            settings: { duration: 15 },
        }))
            .evidence,
        { "720p": 15 },
    );
    await rejects(t2v30, {
        prompt: "a cat",
        settings: { duration: 16 },
    }, "duration over the 3.0 cap");
    // Media URLs: the schema promises a public https:// URL, so it ENFORCES
    // one via `pattern` (a `.refine()` would have been dropped).
    const i2v = "kling#image-to-video/kling-3.0";
    const withUrl = (url: string): Json => ({
        contents: [
            { type: "prompt", text: "the cat yawns" },
            { type: "first_frame", url },
        ],
    });
    await rejects(
        i2v,
        withUrl("data:image/png;base64,iVBOR"),
        "base64 data: URL",
    );
    await rejects(i2v, withUrl("http://example.test/a.png"), "plain http://");
    await rejects(i2v, withUrl("not-a-url"), "malformed URL");
    // the account-level `element` item is not exposed (v1 scope)
    await rejects(i2v, {
        contents: [
            { type: "prompt", text: "x" },
            { type: "element", element_id: "el-1", id: "Zhang" },
        ],
    }, "element content type");
    // Turbo has no last frame
    await rejects("kling#image-to-video/kling-3.0-turbo", {
        contents: [
            { type: "prompt", text: "x" },
            { type: "last_frame", url: "https://example.test/a.png" },
        ],
    }, "last_frame on turbo");
    // motion control: character_orientation has no default, so `settings`
    // is required at the binding (the estimate reads it)
    const dancer = [
        { type: "image", url: "https://example.test/dancer.png" },
        { type: "video", url: "https://example.test/dance.mp4" },
    ];
    await rejects(
        "kling#motion-control/kling-3.0",
        { contents: dancer },
        "missing settings",
    );
    await rejects("kling#motion-control/kling-3.0", {
        contents: dancer,
        settings: { resolution: "720p" },
    }, "missing character_orientation");
});

Deno.test("kling: fn provenance — one lifecycle and one consolidate for all twelve, quantity fns interned per rate shape", async () => {
    const bundle = await testBundle();
    const ids = await endpointIds();
    const first = bundle.endpoints[ids[0]];
    const start = first.lifecycle?.start?.$fn.key;
    const poll = first.lifecycle?.poll?.$fn.key;
    const consolidate = first.usage.consolidate?.$fn.key;
    assert(start && poll && consolidate);
    assertEquals(
        bundle.fnTable[start].provenance,
        "connectors/kling/provider.ts#lifecycle.start",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.lifecycle?.start?.$fn.key, start, id);
        assertEquals(doc.lifecycle?.poll?.$fn.key, poll, id);
        assertEquals(doc.usage.consolidate?.$fn.key, consolidate, id);
        assertEquals(doc.lifecycle?.stop, undefined, `${id}: no stop`);
        assertEquals(doc.timeouts.pollMs, 10_000, id);
    }
    // ≥2 metered lines force doc-level estimate + evidence, but identical
    // source interns: text-to-video and image-to-video share per model, and
    // every resolution-only card (turbo, 2.5, motion) shares one evidence
    const key = (id: string, slot: "estimate" | "evidence") =>
        bundle.endpoints[id].usage[slot].$fn.key;
    assertEquals(
        key("kling#text-to-video/kling-3.0", "evidence"),
        key("kling#image-to-video/kling-3.0", "evidence"),
    );
    assertEquals(
        key("kling#text-to-video/kling-2.6", "estimate"),
        key("kling#image-to-video/kling-2.6", "estimate"),
    );
    const resolutionOnly = key(
        "kling#text-to-video/kling-3.0-turbo",
        "evidence",
    );
    for (
        const id of [
            "kling#image-to-video/kling-3.0-turbo",
            "kling#text-to-video/kling-2.5-turbo",
            "kling#image-to-video/kling-2.5-turbo",
            "kling#motion-control/kling-3.0",
            "kling#motion-control/kling-2.6",
        ]
    ) {
        assertEquals(key(id, "evidence"), resolutionOnly, id);
    }
    // the omni pair and the 3.0 pair key differently — no accidental sharing
    assert(
        key("kling#omni-video/kling-3.0-omni", "evidence") !==
            key("kling#omni-video/kling-o1", "evidence"),
    );
});

Deno.test({
    name:
        "kling#text-to-video/kling-2.5-turbo live: generates a real video and bills actual seconds",
    ignore: liveSkip("kling"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("kling#text-to-video/kling-2.5-turbo"),
            input: {
                body: {
                    prompt: "a cat on a beach at sunset",
                    settings: { resolution: "720p", duration: 5 },
                },
            },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as Record<string, unknown>;
        const outputs = output.outputs as Record<string, string>[];
        assert(outputs[0].url);
        assert(
            !("billing" in output),
            "the receipt is stripped from the payload",
        );
        // Real generations vary by a few ms, so assert the SHAPE: the 720p
        // line billed 5 whole seconds, and a positive charge — the vendor's
        // own receipt when the account runs on a resource package.
        assertEquals(result.usage.evidence, { "720p": 5 });
        assert(result.usage.credits.default > 0);
    },
});
