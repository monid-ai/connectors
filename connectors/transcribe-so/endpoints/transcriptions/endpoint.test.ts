import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * The endpoint's OWN contract: the input gate, the pure estimate, and the
 * `formats` switch that decides which artifacts the completed run fetches.
 * The lifecycle protocol itself is covered by the provider-level
 * `lifecycle.test.ts` (start/poll live on the provider).
 */

const ID = "transcribe-so#transcriptions";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const URL_90S = "https://transcribe.so/test-90s.m4a";

const body = (fields: Record<string, Json>): RunInput => ({
    body: { url: URL_90S, max_charge_usd: 0.1, ...fields },
});

Deno.test("transcribe-so#transcriptions estimate: the hold is the caller's ceiling in whole minutes, and it is PURE", async () => {
    const unit = await testSealedUnit(ID);
    // $0.10 buys 5.99988 minutes at $0.016667 → 6 whole minutes held; the
    // rejecting transport inside estimateEndpoint proves no IO happens
    const tenCents = await estimateEndpoint(unit, body({}));
    assertEquals(tenCents.evidence, { MINUTE: 6 });
    assert(Math.abs(tenCents.credits.default - 6 * 0.016667) < 1e-9);
    // one dollar = one hour of audio (59.998 → 60)
    assertEquals(
        (await estimateEndpoint(unit, body({ max_charge_usd: 1 }))).evidence,
        { MINUTE: 60 },
    );
    // an exact multiple does not ceil to n+1 on a floating-point hair
    assertEquals(
        (await estimateEndpoint(unit, body({ max_charge_usd: 0.033334 })))
            .evidence,
        { MINUTE: 2 },
    );
    // duration_seconds is advisory — it never lowers the hold
    assertEquals(
        (await estimateEndpoint(unit, body({ duration_seconds: 90 })))
            .evidence,
        { MINUTE: 6 },
    );
});

Deno.test("transcribe-so#transcriptions: the input gate — max_charge_usd required, strict keys, formats enum, http(s) URLs", async () => {
    const unit = await testSealedUnit(ID);
    const rejects = async (input: RunInput, why: string) => {
        await assertRejects(
            () => estimateEndpoint(unit, input),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    // the hold cannot be deduced without the ceiling (D25 — required at
    // the binding, the schema file stays optional)
    await rejects({ body: { url: URL_90S } }, "missing max_charge_usd");
    await rejects(body({ max_charge_usd: 0 }), "zero ceiling");
    await rejects(body({ max_charge_usd: -1 }), "negative ceiling");
    // `.strict()` survives the binding's .required()/.extend()
    await rejects(body({ source: "external_url" }), "unknown key `source`");
    await rejects(body({ callback_url: "https://x.test" }), "unknown key");
    // formats is a closed enum, non-empty
    await rejects(body({ formats: ["pdf"] }), "unknown format");
    await rejects(body({ formats: [] }), "empty formats");
    // url: http(s) only, no whitespace
    await rejects(body({ url: "ftp://example.test/a.mp3" }), "ftp url");
    await rejects(body({ url: "not a url" }), "malformed url");
    await rejects(body({ url: "https://example.test/a b.mp3" }), "space");
    // duration is a positive whole number of seconds, at most 12 h
    await rejects(body({ duration_seconds: 0 }), "zero duration");
    await rejects(body({ duration_seconds: 1.5 }), "fractional duration");
    await rejects(body({ duration_seconds: 43_201 }), "over 12 hours");
    // …and the complement: every documented shape clears the gate
    for (
        const input of [
            body({}),
            body({ formats: ["markdown", "srt", "vtt"] }),
            body({ language: "ko", duration_seconds: 90 }),
            body({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
            body({ url: "http://example.test/episode.mp3" }),
        ]
    ) {
        await assertInputAccepted({
            unit,
            input,
            mode: "replay",
            fixture: await loadFixture(`${chains}happy.json`),
        });
    }
});

Deno.test("transcribe-so#transcriptions: formats gates the artifact reads — srt/vtt only when asked", async () => {
    // asked for everything: the RECORDED chain (formats all three) carries
    // three artifact reads and the output carries all three texts
    const chain = await loadFixture(`${chains}happy.json`);
    const all = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: body({
            duration_seconds: 90,
            formats: ["markdown", "srt", "vtt"],
        }),
        mode: "replay",
        fixture: chain,
    });
    assertEquals(all.httpStatus, 200);
    assertEquals(all.timing.attempts, 2);
    const output = all.output as Record<string, unknown>;
    assert((output.transcript_markdown as string).startsWith("# "));
    assert((output.srt as string).startsWith("1\n00:00:00,080 --> "));
    assert((output.vtt as string).startsWith("WEBVTT\n"));
    assertEquals(all.usage, {
        credits: { default: 2 * 0.016667 },
        evidence: { MINUTE: 2 },
    });
    // asked for subtitles only: markdown is STILL fetched (it carries the
    // chapters and is the transcript), and the chain minus its vtt call
    // has no vtt read left — one would exhaust the replay and fail loudly
    const srtOnly = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: body({ duration_seconds: 90, formats: ["srt"] }),
        mode: "replay",
        fixture: { ...chain, calls: chain.calls.slice(0, 5) },
    });
    const srtOutput = srtOnly.output as Record<string, unknown>;
    assert("transcript_markdown" in srtOutput);
    assert("srt" in srtOutput);
    assert(!("vtt" in srtOutput));
    // the default (markdown only): the same chain cut after the transcript
    // read — no subtitle call is left to consume
    const md = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: body({ duration_seconds: 90 }),
        mode: "replay",
        fixture: { ...chain, calls: chain.calls.slice(0, 4) },
    });
    const mdOutput = md.output as Record<string, unknown>;
    assert("transcript_markdown" in mdOutput);
    assert(!("srt" in mdOutput) && !("vtt" in mdOutput));
});
