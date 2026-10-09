import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

/**
 * THE transcribe-so lifecycle suite (fixture strategy v2): provider-level
 * shared chains in `fixtures/` drive the ONE endpoint through its start /
 * poll protocol, which lives on the provider. `happy.json` is a REAL
 * recording (2026-09-26, prod, the monid@ key, our own 90-second clip with
 * every format asked); the `synthetic-*` chains cover the shapes a recording
 * cannot provoke on demand, with body shapes copied from the served API
 * (app/api/v1/_serialize.ts) and cross-checked against the recording.
 *
 * The 90-second clip is the arithmetic anchor: 90 s → 2 billed minutes
 * (whole minutes up) × the pinned $0.016667 = $0.033334, the derived fold,
 * which IS the bill — there is no consolidate, so no vendor claim and no
 * `usage.mismatch` can exist (the deep-equal on `usage` proves it).
 */

const ID = "transcribe-so#transcriptions";
const chains = fromFileUrl(new URL("./fixtures/", import.meta.url));

/** The input the synthetic chains were shaped on: our own clip, duration
 *  known, a 10-cent ceiling, default formats (markdown only). */
const INPUT: RunInput = {
    body: {
        url: "https://transcribe.so/test-90s.m4a",
        duration_seconds: 90,
        max_charge_usd: 0.1,
    },
};

/** The RECORDING input (happy.json): the same clip with every format. */
const RECORDED_INPUT: RunInput = {
    body: {
        ...INPUT.body as Record<string, Json>,
        formats: ["markdown", "srt", "vtt"],
    },
};

/** The id the synthetic rows carry — it must never reach the output. */
const ROW_ID = "8123";
/** The id of the recorded row (the monid@ account's own row). */
const RECORDED_ROW_ID = "14217";

async function run(fixture: string, input: RunInput = INPUT) {
    return await runEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });
}

Deno.test("transcribe-so: the RECORDED happy chain folds 2 minutes at the pinned rate, and never leaks the id", async () => {
    const result = await run("happy.json", RECORDED_INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the derived fold IS the bill: the server probed 89 s (we said 90),
    // whole minutes up = 2; no consolidate, no claim, no mismatch (zUsage
    // is strict — the deep compare proves the key is absent)
    assertEquals(result.usage, {
        credits: { default: 2 * 0.016667 },
        evidence: { MINUTE: 2 },
    });
    // engine-stamped timing: one timed-out long-poll + the terminal one
    assertEquals(result.timing.attempts, 2);
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), [
        "chapters",
        "duration_seconds",
        "language",
        "srt",
        "status",
        "title",
        "transcript_markdown",
        "vtt",
    ]);
    assertEquals(output.status, "completed");
    // the DETECTED language, not the requested "auto"
    assertEquals(output.language, "en");
    // the PROBED duration, not the 90 we sent
    assertEquals(output.duration_seconds, 89);
    // a direct-media source is titled by its file name
    assertEquals(output.title, "test-90s.m4a");
    const md = output.transcript_markdown as string;
    assert(md.startsWith("# test-90s.m4a\n\n---\n\n## Table of Contents\n"));
    assert(md.includes("**[0:00 → 0:07]** SPEAKER_00"));
    assert(
        (output.srt as string).startsWith("1\n00:00:00,080 --> 00:00:01,520\n"),
    );
    assert((output.vtt as string).startsWith("WEBVTT\n\n1\n00:00:00.080 --> "));
    // chapters keep title/summary/timing (a 90 s clip gets two, summaries
    // null); id (-1/-2 here), chapter_index and url are stripped
    assertEquals(output.chapters, [
        {
            title: "Stop dismissing your partner's feelings",
            summary: null,
            start_seconds: 0,
            end_seconds: 66.8,
        },
        {
            title: "Relationships die from small cuts",
            summary: null,
            start_seconds: 66.8,
            end_seconds: 89,
        },
    ]);
    // the row's charge_usd is not data, and the shared-key rule holds: no
    // id anywhere
    assert(!("charge_usd" in output), "charge_usd never rides the output");
    assert(
        !JSON.stringify(output).includes(RECORDED_ROW_ID),
        "the transcription id must never ride the output",
    );
});

Deno.test("transcribe-so: 402 insufficient_funds is DATA — vendor status, envelope verbatim, zero usage", async () => {
    const result = await run("synthetic-insufficient-funds.json");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.providerHttpStatus, undefined); // relayed, not synthesized
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.timing.attempts, 0);
    const output = result.output as { error: Record<string, unknown> };
    assertEquals(output.error.code, "insufficient_funds");
    assertEquals(output.error.request_id, "req_synthetic_402");
});

Deno.test("transcribe-so: a failed job → synthesized 502, fixed error, the vendor's internal text never copied", async () => {
    const result = await run("synthetic-failed.json");
    assertEquals(result.httpStatus, 502); // OURS — the JOB failed
    assertEquals(result.providerHttpStatus, 200); // THEIRS — the poll was fine
    assertEquals(result.isProviderError, true);
    // the failed row DOES carry a duration: the zero comes from the error
    // path (a fn cannot bill an error), matching the vendor side, where the
    // failure trigger releases the hold and nothing is charged
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: {
            code: "transcription_failed",
            message:
                "transcribe.so could not transcribe this media. The job's hold was released and nothing was charged.",
        },
    });
    const text = JSON.stringify(result.output);
    assert(!text.includes("ffmpeg") && !text.includes(ROW_ID));
});

Deno.test("transcribe-so: a rate-limited status read keeps the run alive and Retry-After sets the next tick", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-poll-rate-limited.json`),
    });
    const started = await loaded.start(INPUT);
    assert(started.kind === "RUNNING");
    assertEquals(started.state.externalRunId, ROW_ID);
    assertEquals(started.state.stage, "processing");
    assertEquals(started.pollAfterMs, 2_000); // the doc's cadence
    // 429 on OUR read: the job is still running (and charged) upstream —
    // RUNNING, `Retry-After: 7` seconds → 7000 ms; state carries forward
    const held = await loaded.poll(INPUT, started.state);
    assert(held.kind === "RUNNING");
    assertEquals(held.pollAfterMs, 7_000);
    assertEquals(held.state.externalRunId, ROW_ID);
    const settled = await loaded.poll(INPUT, held.state);
    assert(settled.kind === "COMPLETED");
    assertEquals(settled.httpStatus, 200);
    assertEquals(settled.usage, {
        credits: { default: 2 * 0.016667 },
        evidence: { MINUTE: 2 },
    });
    assertEquals((settled.output as Record<string, unknown>).chapters, []);
});

Deno.test("transcribe-so: a 409 on the create (same Idempotency-Key still in flight) THROWS, and the retry converges on the one job", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-create-conflict.json`),
    });
    // A job may already exist upstream and be charging: settling this as
    // data would leave it with nothing polling it. Retriable throw instead.
    await assertRejects(() => loaded.start(INPUT), Error, "409");
    // the host retries the start tick with the SAME run id → the key
    // replays the original job's 202 and the run parks on it
    const started = await loaded.start(INPUT);
    assert(started.kind === "RUNNING");
    assertEquals(started.state.externalRunId, ROW_ID);
    const settled = await loaded.poll(INPUT, started.state);
    assert(settled.kind === "COMPLETED");
    assertEquals(settled.httpStatus, 200);
    assertEquals(settled.usage, {
        credits: { default: 2 * 0.016667 },
        evidence: { MINUTE: 2 },
    });
});

Deno.test("transcribe-so: fn provenance — start/poll on the provider, no consolidate, no stop, dollars pool, 2 s cadence", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("transcribe-so#")
    );
    assertEquals(ids, [ID]);
    const doc = bundle.endpoints[ID];
    assertEquals(
        doc.request.url,
        "https://transcribe.so/api/v1/transcriptions",
    );
    const start = doc.lifecycle?.start?.$fn.key;
    const poll = doc.lifecycle?.poll?.$fn.key;
    assert(start && poll);
    // no vendor claim: the fold settles (design D6 of the change)
    assertEquals(doc.usage.consolidate, undefined);
    assertEquals(
        bundle.fnTable[start].provenance,
        "connectors/transcribe-so/provider.ts#lifecycle.start",
    );
    assertEquals(
        bundle.fnTable[poll].provenance,
        "connectors/transcribe-so/provider.ts#lifecycle.poll",
    );
    assertEquals(doc.lifecycle?.stop, undefined, "no cancel upstream");
    assertEquals(doc.timeouts, {
        requestMs: 35_000,
        runMs: 21_600_000,
        pollMs: 2_000,
    });
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
    assertEquals(doc.usage.credits.default.label, "US dollars");
    assertEquals(doc.usage.model, {
        kind: "PER_UNIT",
        unit: "MINUTE",
        every: 1,
        label: "audio minutes",
        description: "billed audio minutes, whole minutes up " +
            "(US$1 per hour pay-as-you-go retail)",
        consumes: { credit: "default", amount: 0.016667 },
    });
    assertEquals(doc.meta.categories, ["speech"]);
});

Deno.test({
    name:
        "transcribe-so#transcriptions live: transcribes the 90-second clip and bills 2 minutes",
    ignore: liveSkip("transcribe-so"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as Record<string, unknown>;
        assert((output.transcript_markdown as string).length > 0);
        assert(!("charge_usd" in output));
        // Real runs vary (the server probes the true length and the clip
        // may be re-encoded), so assert the SHAPE, never pinned amounts:
        // a positive whole-minute count and a positive dollar fold.
        const minutes = result.usage.evidence.MINUTE;
        assert(typeof minutes === "number" && Number.isInteger(minutes));
        assert(minutes > 0);
        const dollars = result.usage.credits.default;
        assert(typeof dollars === "number" && dollars > 0);
    },
});
