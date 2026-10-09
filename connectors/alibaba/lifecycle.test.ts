import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
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
 * THE alibaba test suite (fixture strategy v2): ten minimal shared chains in
 * `fixtures/` exercise every endpoint of the provider. `{{request.url}}` /
 * `{{request.origin}}` bind each chain to the endpoint under test: the six
 * Wan video models post to ONE submit path and poll ONE task path, the four
 * image models post to ONE blocking path — so one chain per shape serves
 * its whole family.
 *
 * ALL chains are SYNTHETIC (no Model Studio key was available on
 * 2026-09-16); the body shapes are the ones the live API reference pages
 * document. Replace them with `deno task record` output once a key exists.
 *
 * DashScope reports no dollar figure, so there is no consolidate claim and
 * the derived fold IS the bill: the expectations below are a LITERAL table
 * of dollars — never re-derived from the doc's own model, which would make
 * the test a tautology (clay D7a).
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput["body"]>;

const VIDEO = [
    "alibaba#v1/video/wan3.0",
    "alibaba#v1/video/wan3.0-prime",
    "alibaba#v1/video/wan2.7-t2v",
    "alibaba#v1/video/wan2.7-i2v",
    "alibaba#v1/video/wan2.7-r2v",
    "alibaba#v1/video/wan2.7-videoedit",
] as const;
const QWEN = [
    "alibaba#v1/image/qwen-image-3.0-pro",
    "alibaba#v1/image/qwen-image-3.0",
] as const;
const WAN_IMAGE = [
    "alibaba#v1/image/wan2.7-image-pro",
    "alibaba#v1/image/wan2.7-image",
] as const;

/**
 * THE LITERAL RATE TABLE — the full `usage` each endpoint settles on its
 * family's happy chain with the test input. Typed by hand from
 * https://www.alibabacloud.com/help/en/model-studio/model-pricing
 * (Singapore, 2026-09-16): video 5 s at 720P × $0.10 / $0.14 / $0.10 ×4;
 * Qwen one 1K output + one input image ($0.04 + $0.003 / $0.03 + $0.003);
 * Wan Image two images × $0.075 / $0.03. A new endpoint MUST add a row
 * (the key-set assertion below).
 */
const HAPPY: Record<
    string,
    { credits: number; evidence: Record<string, number> }
> = {
    "alibaba#v1/video/wan3.0": { credits: 0.5, evidence: { "720p": 5 } },
    "alibaba#v1/video/wan3.0-prime": { credits: 0.7, evidence: { "720p": 5 } },
    "alibaba#v1/video/wan2.7-t2v": { credits: 0.5, evidence: { "720p": 5 } },
    "alibaba#v1/video/wan2.7-i2v": { credits: 0.5, evidence: { "720p": 5 } },
    "alibaba#v1/video/wan2.7-r2v": { credits: 0.5, evidence: { "720p": 5 } },
    "alibaba#v1/video/wan2.7-videoedit": {
        credits: 0.5,
        evidence: { "720p": 5 },
    },
    "alibaba#v1/image/qwen-image-3.0-pro": {
        credits: 0.043,
        evidence: { "output_image_1k": 1, "input_image": 1 },
    },
    "alibaba#v1/image/qwen-image-3.0": {
        credits: 0.033,
        evidence: { "output_image": 1, "input_image": 1 },
    },
    "alibaba#v1/image/wan2.7-image-pro": {
        credits: 0.15,
        evidence: { RESULT: 2 },
    },
    "alibaba#v1/image/wan2.7-image": { credits: 0.06, evidence: { RESULT: 2 } },
};

/**
 * Deep-compares a settled or estimated usage against a literal expectation,
 * with float tolerance on the dollar fold only: 0.075 × 3 folds to
 * 0.22499999999999998 and the expectation is still written as the literal
 * 0.225 (provider-port rule; the engine does no canonicalization). The
 * evidence and the ABSENCE of a mismatch key are compared exactly.
 */
function assertUsage(
    actual: {
        credits: Record<string, number>;
        evidence: Record<string, number>;
        mismatch?: unknown;
    },
    expected: { credits: number; evidence: Record<string, number> },
    label?: string,
) {
    assertEquals(Object.keys(actual).sort(), ["credits", "evidence"], label);
    assertEquals(Object.keys(actual.credits), ["default"], label);
    assertAlmostEquals(actual.credits.default, expected.credits, 1e-9, label);
    assertEquals(actual.evidence, expected.evidence, label);
}

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("alibaba#"))
        .sort();
};

const inputFor = (id: string): RunInput => {
    const body = INPUTS[id.split("#")[1]];
    assert(body !== undefined, `${id}: no test input in test-inputs.json`);
    return { body };
};

/** The test input with different `parameters` — flips the rate line. */
const withParameters = (
    id: string,
    parameters: Record<string, Json>,
): RunInput => {
    const body = inputFor(id).body as Record<string, Json>;
    return {
        body: {
            ...body,
            parameters: {
                ...(body.parameters as Record<string, Json>),
                ...parameters,
            },
        },
    };
};

const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

Deno.test("alibaba: the literal rate table names exactly the metered endpoints", async () => {
    assertEquals(Object.keys(HAPPY).sort(), await endpointIds());
    assertEquals([...VIDEO, ...QWEN, ...WAN_IMAGE].sort(), await endpointIds());
});

Deno.test("alibaba video: every model completes the async chain, folded at its OWN rate", async () => {
    const chain = await fixture("synthetic-video-succeeded");
    for (const id of VIDEO) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: chain,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        // no claim (DashScope reports no dollars) ⇒ the fold IS the bill,
        // and zUsage is strict, so the deep compare proves no mismatch
        assertUsage(result.usage, {
            credits: HAPPY[id].credits,
            evidence: HAPPY[id].evidence,
        }, id);
        // the task envelope settles verbatim — the billing basis stays
        // visible to the caller (design D11)
        const output = result.output as Record<string, Json>;
        const out = output.output as Record<string, Json>;
        assertEquals(out.task_status, "SUCCEEDED", id);
        assert(typeof out.video_url === "string" && out.video_url.length > 0);
        assertEquals((output.usage as Record<string, Json>).duration, 5, id);
        // engine-stamped timing: one RUNNING poll + the terminal one
        assertEquals(result.timing.attempts, 2, id);
    }
});

Deno.test("alibaba video: the rate line follows the requested resolution", async () => {
    const chain = await fixture("synthetic-video-succeeded");
    const rows: [string, string, number][] = [
        ["alibaba#v1/video/wan3.0", "480P", 0.25],
        ["alibaba#v1/video/wan3.0", "1080P", 1],
        ["alibaba#v1/video/wan3.0-prime", "480P", 0.34],
        ["alibaba#v1/video/wan3.0-prime", "1080P", 1.4],
        ["alibaba#v1/video/wan2.7-t2v", "1080P", 0.75],
        ["alibaba#v1/video/wan2.7-videoedit", "1080P", 0.75],
    ];
    for (const [id, resolution, dollars] of rows) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: withParameters(id, { resolution }),
            mode: "replay",
            fixture: chain,
        });
        assertUsage(result.usage, {
            credits: dollars,
            evidence: { [resolution.toLowerCase()]: 5 },
        }, `${id} ${resolution}`);
    }
});

Deno.test("alibaba video: fractional usage.duration is reported as-is and folded UP to whole seconds", async () => {
    const id = "alibaba#v1/video/wan2.7-videoedit";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await fixture("synthetic-video-succeeded-fractional"),
    });
    // DashScope says 10.04 s (5.02 in + 5.02 out); the engine's
    // `ceil(q / every) × amount` bills 11 × $0.10 (owner decision, D4)
    assertUsage(result.usage, { credits: 1.1, evidence: { "720p": 10.04 } });
});

Deno.test("alibaba video: r2v caps the billed input side at 5 s from the component fields", async () => {
    const chain = await fixture("synthetic-video-succeeded-r2v-input");
    const r2v = await runEndpoint({
        unit: await testSealedUnit("alibaba#v1/video/wan2.7-r2v"),
        input: inputFor("alibaba#v1/video/wan2.7-r2v"),
        mode: "replay",
        fixture: chain,
    });
    // output 10 + min(input 8, 5) = 15, NOT the reported sum of 18
    assertUsage(r2v.usage, { credits: 1.5, evidence: { "720p": 15 } });
    // every other model reads usage.duration verbatim
    const wan3 = await runEndpoint({
        unit: await testSealedUnit("alibaba#v1/video/wan3.0"),
        input: inputFor("alibaba#v1/video/wan3.0"),
        mode: "replay",
        fixture: chain,
    });
    assertUsage(wan3.usage, { credits: 1.8, evidence: { "720p": 18 } });
});

Deno.test("alibaba video: task failure → synthesized 500, zero usage, the envelope as data", async () => {
    const id = "alibaba#v1/video/wan2.7-i2v";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await fixture("synthetic-video-failed"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500); // OURS — the TASK failed
    assertEquals(result.providerHttpStatus, 200); // THEIRS — the GET was fine
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = (result.output as Record<string, Json>).output as Record<
        string,
        Json
    >;
    assertEquals(out.task_status, "FAILED");
    assertEquals(out.code, "InvalidParameter");
});

Deno.test("alibaba video: success with no video_url → synthesized 502, zero usage", async () => {
    const id = "alibaba#v1/video/wan3.0-prime";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await fixture("synthetic-video-no-url"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    // the body DOES carry usage: the zero-bill comes from the error path
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("alibaba video: a failing poll THROWS rather than abandoning a paid generation", async () => {
    const id = "alibaba#v1/video/wan2.7-t2v";
    const unit = await testSealedUnit(id);
    const chain = await fixture("synthetic-poll-failed");
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: inputFor(id),
                mode: "replay",
                fixture: chain,
            }),
        Error,
        "503",
    );
});

Deno.test("alibaba: a rejected call is DATA on both paths — vendor status, zero usage", async () => {
    const chain = await fixture("synthetic-submit-rejected");
    for (
        const id of ["alibaba#v1/video/wan3.0", "alibaba#v1/image/wan2.7-image"]
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: chain,
        });
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.httpStatus, 400, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        assertEquals(
            (result.output as Record<string, Json>).code,
            "InvalidParameter",
            id,
        );
    }
});

Deno.test("alibaba: a 2xx carrying the error envelope → synthesized 502 on both paths, zero usage", async () => {
    const chain = await fixture("synthetic-submit-envelope-error");
    for (
        const id of [
            "alibaba#v1/video/wan2.7-r2v",
            "alibaba#v1/image/qwen-image-3.0",
        ]
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: chain,
        });
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.httpStatus, 502, id); // OURS — the envelope said error
        assertEquals(result.providerHttpStatus, 200, id); // THEIRS — a 200
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        assertEquals(
            (result.output as Record<string, Json>).code,
            "DataInspectionFailed",
            id,
        );
    }
});

Deno.test("alibaba qwen: the blocking call settles both lines; the output tier follows the REQUEST size", async () => {
    const chain = await fixture("synthetic-qwen-succeeded");
    for (const id of QWEN) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: chain,
        });
        assertEquals(result.httpStatus, 200, id);
        assertUsage(result.usage, {
            credits: HAPPY[id].credits,
            evidence: HAPPY[id].evidence,
        }, id);
        // the blocking relay never polls: zero poll attempts stamped
        assertEquals(result.timing.attempts, 0, id);
        // the receipt counters stay visible to the caller
        const usage = (result.output as Record<string, Json>).usage as Record<
            string,
            Json
        >;
        assertEquals(usage.output_image_count, 1, id);
        // …and the delivered images match the fixture: one
        assertEquals(deliveredImages(result.output).length, 1, id);
    }
    // 2048*2048 is above 2,250,000 px: the pro doc bills the 2K line from
    // the request, whatever the response echoes
    const twoK = await runEndpoint({
        unit: await testSealedUnit("alibaba#v1/image/qwen-image-3.0-pro"),
        input: withParameters("alibaba#v1/image/qwen-image-3.0-pro", {
            size: "2048*2048",
        }),
        mode: "replay",
        fixture: chain,
    });
    assertUsage(twoK.usage, {
        credits: 0.078,
        evidence: { "output_image_2k": 1, "input_image": 1 },
    });
});

Deno.test("alibaba wan image: bills the images actually generated and strips the token counters", async () => {
    const chain = await fixture("synthetic-wan-image-succeeded");
    for (const id of WAN_IMAGE) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: chain,
        });
        assertEquals(result.httpStatus, 200, id);
        assertUsage(result.usage, {
            credits: HAPPY[id].credits,
            evidence: HAPPY[id].evidence,
        }, id);
        const usage = (result.output as Record<string, Json>).usage as Record<
            string,
            Json
        >;
        // the "not billed" token counters are gone (design D11)…
        assert(!("input_tokens" in usage), id);
        assert(!("output_tokens" in usage), id);
        assert(!("total_tokens" in usage), id);
        // …the billing basis stays
        assertEquals(usage.image_count, 2, id);
        assertEquals(usage.size, "1488*704", id);
        // …and the delivered images match the fixture: two
        assertEquals(deliveredImages(result.output).length, 2, id);
    }
});

/** The image URLs a DashScope image envelope delivers:
 *  `output.choices[0].message.content[*].image`. */
function deliveredImages(output: Json): string[] {
    const out = (output as Record<string, Json>).output as Record<string, Json>;
    const choices = out.choices as Record<string, Json>[];
    const message = choices[0].message as Record<string, Json>;
    return (message.content as Record<string, Json>[])
        .map((part) => part.image)
        .filter((image): image is string => typeof image === "string");
}

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

Deno.test("alibaba: estimates hold the requested basis on the requested line", async () => {
    // no parameters at all: the binding materializes 720P × 5 s (design D8)
    assertUsage(
        await estimateFor("alibaba#v1/video/wan3.0", {
            input: { prompt: "a cat" },
        }),
        { credits: 0.5, evidence: { "720p": 5 } },
    );
    // "auto" defers the length to the model, so the hold is the 30 s ceiling
    assertUsage(
        await estimateFor("alibaba#v1/video/wan3.0-prime", {
            input: { prompt: "a cat" },
            parameters: { resolution: "1080P", duration: "auto" },
        }),
        { credits: 8.4, evidence: { "1080p": 30 } },
    );
    // videoedit without a duration keeps the source length: 10 s ceiling
    assertUsage(
        await estimateFor("alibaba#v1/video/wan2.7-videoedit", {
            input: {
                media: [{ type: "video", url: "https://example.test/a.mp4" }],
            },
        }),
        { credits: 1, evidence: { "720p": 10 } },
    );
    // qwen: n outputs on the tier the size selects, plus the input images
    assertUsage(
        await estimateFor("alibaba#v1/image/qwen-image-3.0-pro", {
            input: {
                messages: [{
                    role: "user",
                    content: [
                        { image: "https://example.test/a.png" },
                        { image: "https://example.test/b.png" },
                        { text: "merge them" },
                    ],
                }],
            },
            parameters: { size: "2048*2048", n: 3 },
        }),
        {
            credits: 0.231,
            evidence: { "output_image_2k": 3, "input_image": 2 },
        },
    );
    // wan image: n, or DashScope's default — 1 normally, 12 in set mode
    const text = { messages: [{ role: "user", content: [{ text: "a cat" }] }] };
    assertUsage(
        await estimateFor("alibaba#v1/image/wan2.7-image-pro", { input: text }),
        { credits: 0.075, evidence: { RESULT: 1 } },
    );
    assertUsage(
        await estimateFor("alibaba#v1/image/wan2.7-image", {
            input: text,
            parameters: { enable_sequential: true },
        }),
        { credits: 0.36, evidence: { RESULT: 12 } },
    );
});

Deno.test("alibaba: the input schema rejects before the wire", async () => {
    const rejects = async (id: string, body: Json, why: string) => {
        await assertRejects(
            () => estimateFor(id, body),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    const wan3 = "alibaba#v1/video/wan3.0";
    // the vendor's own "prompt or media" rule, compiled as a union
    await rejects(
        wan3,
        { input: { negative_prompt: "x" } },
        "neither prompt nor media",
    );
    // `model` is pinned, never caller-supplied (design D2)
    await rejects(
        wan3,
        { model: "wan3.0-video", input: { prompt: "x" } },
        "model key",
    );
    // `.strict()` keeps v1's excluded knobs excluded
    await rejects(wan3, {
        input: { prompt: "x" },
        parameters: { shot_type: "multi" },
    }, "unknown parameter");
    const t2v = "alibaba#v1/video/wan2.7-t2v";
    await rejects(t2v, {
        input: { prompt: "x" },
        parameters: { resolution: "480P" },
    }, "unserved resolution");
    await rejects(
        t2v,
        { input: { prompt: "x" }, parameters: { duration: 16 } },
        "duration over the cap",
    );
    // …while the edge passes
    assertEquals(
        (await estimateFor(t2v, {
            input: { prompt: "x" },
            parameters: { duration: 15 },
        })).evidence,
        { "720p": 15 },
    );
    // media URLs: the schema promises https://, so it ENFORCES it (pattern)
    const i2v = "alibaba#v1/video/wan2.7-i2v";
    await rejects(i2v, {
        input: {
            media: [{ type: "first_frame", url: "data:image/png;base64,AAA" }],
        },
    }, "base64 data: URL");
    await rejects(i2v, {
        input: {
            media: [{ type: "first_frame", url: "http://example.test/a.png" }],
        },
    }, "plain http://");
    // qwen: size is REQUIRED at the binding (it selects the price tier) and
    // uses DashScope's asterisk form, not the OpenAI-compatible "x"
    const qwen = "alibaba#v1/image/qwen-image-3.0";
    const msg = { messages: [{ role: "user", content: [{ text: "a cat" }] }] };
    await rejects(qwen, { input: msg }, "missing size");
    await rejects(
        qwen,
        { input: msg, parameters: { size: "1024x1024" } },
        "x separator",
    );
    await rejects(
        qwen,
        { input: msg, parameters: { size: "1024*1024", n: 7 } },
        "n over 6",
    );
    // exactly one user message
    await rejects("alibaba#v1/image/wan2.7-image", {
        input: {
            messages: [
                { role: "user", content: [{ text: "a" }] },
                { role: "user", content: [{ text: "b" }] },
            ],
        },
    }, "two messages");
    // 4K is a pro-only size
    await rejects("alibaba#v1/image/wan2.7-image", {
        input: msg,
        parameters: { size: "4K" },
    }, "4K on the standard model");
});

Deno.test("alibaba: fn provenance — the async pair is the provider's, the four image docs share ONE blocking override", async () => {
    const bundle = await testBundle();
    const providerStart = bundle.endpoints[VIDEO[0]].lifecycle?.start?.$fn.key;
    const poll = bundle.endpoints[VIDEO[0]].lifecycle?.poll?.$fn.key;
    const imageStart = bundle.endpoints[QWEN[0]].lifecycle?.start?.$fn.key;
    assert(providerStart && poll && imageStart);
    assert(
        providerStart !== imageStart,
        "the blocking relay is not the submit",
    );
    assertEquals(
        bundle.fnTable[providerStart].provenance,
        "connectors/alibaba/provider.ts#lifecycle.start",
    );
    for (const id of VIDEO) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.lifecycle?.start?.$fn.key, providerStart, id);
        assertEquals(doc.request.headers?.["X-DashScope-Async"], "enable", id);
        assertEquals(doc.timeouts.requestMs, 30_000, id);
    }
    for (const id of [...QWEN, ...WAN_IMAGE]) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.lifecycle?.start?.$fn.key, imageStart, id);
        // the blocking path must NOT carry the async header
        assertEquals(doc.request.headers?.["X-DashScope-Async"], undefined, id);
        assertEquals(doc.timeouts.requestMs, 600_000, id);
        // inherited and inert (suzanne D3): start always COMPLETES
        assertEquals(doc.timeouts.pollMs, 30_000, id);
    }
    for (const id of await endpointIds()) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.lifecycle?.poll?.$fn.key, poll, id);
        assertEquals(doc.lifecycle?.stop, undefined, `${id}: no stop`);
        assertEquals(doc.usage.consolidate, undefined, `${id}: no claim`);
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
    }
    // identical source interns: one evidence for the five models that read
    // usage.duration verbatim, r2v's fuse stands alone
    const plain =
        bundle.endpoints["alibaba#v1/video/wan2.7-t2v"].usage.evidence.$fn.key;
    for (
        const id of [
            "alibaba#v1/video/wan3.0",
            "alibaba#v1/video/wan3.0-prime",
            "alibaba#v1/video/wan2.7-i2v",
            "alibaba#v1/video/wan2.7-videoedit",
        ]
    ) {
        assertEquals(bundle.endpoints[id].usage.evidence.$fn.key, plain, id);
    }
    assert(
        bundle.endpoints["alibaba#v1/video/wan2.7-r2v"].usage.evidence.$fn
            .key !== plain,
    );
});

Deno.test({
    name:
        "alibaba#v1/image/wan2.7-image live: generates a real image and bills it",
    ignore: liveSkip("alibaba"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("alibaba#v1/image/wan2.7-image"),
            input: {
                body: {
                    input: {
                        messages: [{
                            role: "user",
                            content: [{ text: "a cat on a beach at sunset" }],
                        }],
                    },
                    parameters: { n: 1, size: "1K" },
                },
            },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const usage = (result.output as Record<string, Json>).usage as Record<
            string,
            Json
        >;
        assert(!("input_tokens" in usage), "the token counters are stripped");
        // assert the SHAPE, not the amount: one image on the RESULT line and
        // a positive fold
        assertEquals(result.usage.evidence, { RESULT: 1 });
        assert(result.usage.credits.default > 0);
    },
});
