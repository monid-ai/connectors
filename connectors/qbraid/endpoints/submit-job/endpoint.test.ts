import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "qbraid#submit-job";
const BELL =
    'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;\n';
const INPUT = {
    body: {
        deviceQrn: "qbraid:qbraid:sim:qir-sv",
        shots: 10,
        name: "monid-fixture-bell",
        program: { format: "qasm2", data: BELL },
    },
};

const run = async (fixture: string, input = INPUT) =>
    await runEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${fixture}.json`),
    });

type Out = {
    job: Record<string, unknown>;
    result: Record<string, unknown> & {
        resultData: { measurementCounts: Record<string, number> };
    };
};

Deno.test(`${ID} happy (recorded): submit → QUEUED → COMPLETED → result, ONE output`, async () => {
    const result = await run("happy");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // final cost 0 (D27: zero entries prune) + evidence CREDIT 0
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    const output = result.output as Out;
    assertEquals(Object.keys(output).sort(), ["job", "result"]);
    assertEquals(output.job.status, "COMPLETED");
    assertEquals(output.result.resultData.measurementCounts, {
        "11": 4,
        "00": 6,
    });
    // the receipt left the payload — both copies; the quote stays
    assertEquals("cost" in output.job, false);
    assertEquals("cost" in output.result, false);
    assertEquals(output.job.estimatedCost, 0);
    // the handle and the account's internals never reach the caller
    for (const key of ["jobQrn", "organizationUserId", "gcsDestination"]) {
        assertEquals(key in output.job, false, key);
    }
});

Deno.test(`${ID} priced: the final cost claim wins, fold agrees exactly`, async () => {
    const result = await run("synthetic-priced", {
        body: { ...INPUT.body, deviceQrn: "aws:aqt:qpu:ibex-q1", shots: 100 },
    });
    assertEquals(result.httpStatus, 200);
    // 265 credits claimed; 265 000 000 millionths × 0.000001 folds to 265
    // within 1e-9, so NO mismatch key rides out (zUsage is strict)
    assertEquals(result.usage, {
        credits: { default: 265 },
        evidence: { CREDIT: 265_000_000 },
    });
});

Deno.test(`${ID}: 201 + success:false becomes a 502 and bills NOTHING`, async () => {
    const result = await run("synthetic-rejected-201");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 201);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} failed job (recorded): synthesized 500 carries the statusMsg, bills nothing`, async () => {
    const result = await run("failed");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as {
        message: string;
        code: string;
        raw: { job: Record<string, unknown> };
    };
    assertEquals(output.code, "JOB_FAILED");
    assert(output.message.includes("Missing register declaration"));
    assertEquals("jobQrn" in output.raw.job, false);
});

for (
    const [fixture, cancelStatus] of [
        ["stop-conflict", 409],
        ["synthetic-stop", 202],
    ] as const
) {
    Deno.test(`${ID} stop (${fixture}): cancel is best effort — ${cancelStatus} settles nothing`, async () => {
        const loaded = await loadEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "replay",
            fixture: await loadFixture(`${fixturesDir}${fixture}.json`),
        });
        const started = await loaded.start(INPUT);
        assert(started.kind === "RUNNING");
        assert(started.state.externalRunId?.includes("-qjob-"));
        // the replay fails loudly unless stop POSTs .../{qrn}/cancel
        assertEquals(await loaded.stop(INPUT, started.state), {
            kind: "STOPPED_UNSETTLED",
        });
    });
}

for (
    const [fixture, status, code] of [
        ["provider-error", 401, "INVALID_API_KEY_FORMAT"],
        ["device-not-found", 404, "NOT_FOUND"],
    ] as const
) {
    Deno.test(`${ID} provider error ${status}: data, zero usage, digested`, async () => {
        const result = await run(fixture);
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals((result.output as Record<string, unknown>).code, code);
    });
}

Deno.test(`${ID} estimate promises nothing — the price is a device fact`, async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), INPUT);
    assertEquals(usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: near-valid bad bodies are INVALID_INPUT, their twins pass`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const program = INPUT.body.program;
    // `data: null` is NOT in the rejected set: the schema's `.refine` compiles to
    // nothing (D25 note in schema/inputs.ts), so only a MISSING `data` is
    // wire-rejected; a null one is the vendor's 400.
    for (
        const bad of [
            { ...INPUT.body, deviceQrn: "" },
            { ...INPUT.body, shots: -1 },
            { ...INPUT.body, program: { format: "qasm2" } },
            { ...INPUT.body, program: [] },
            // shared key: a caller-chosen group QRN is refused, as is any
            // unknown key (the binding is `.strict()`)
            {
                ...INPUT.body,
                groupJobQrn: "qbraid:qbraid:sim:qir-sv-32de-qgroup-0",
            },
            { ...INPUT.body, unexpected: true },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(bad),
        );
    }
    for (
        const ok of [
            INPUT.body,
            {
                ...INPUT.body,
                program: { format: "ionq.circuit.v0", data: { qubits: 1 } },
            },
            { ...INPUT.body, program: [program, program] },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { body: ok },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name:
        `${ID} live (gated on QBRAID_CREDENTIALS_API_KEY): 10 free shots on the QIR simulator, run to its result`,
    ignore: liveSkip("qbraid"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape only: the cost is the vendor's and may change
        assertEquals(Object.keys(result.usage).sort(), ["credits", "evidence"]);
        const output = result.output as Out;
        assertEquals(output.job.status, "COMPLETED");
        assertEquals(
            typeof output.result.resultData.measurementCounts,
            "object",
        );
    },
});
