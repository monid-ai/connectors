import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const BELL =
    'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;\n';

/**
 * qBraid's rate card as each endpoint's happy fixture settles it — LITERALS
 * on purpose (deriving them from the docs' own models would make this a
 * tautology). Nine endpoints are free; `#submit-job` bills the finished
 * job's own cost claim, and the recorded happy run is the free simulator
 * (claim 0 prunes — the priced arithmetic is pinned in the endpoint test).
 * A new endpoint must state its row here.
 */
const RATE: Record<
    string,
    {
        input: RunInput;
        fixture?: string;
        status?: number;
        usage: Record<string, unknown>;
    }
> = {
    "qbraid#list-devices": {
        input: { queryParams: { deviceType: "QPU", limit: 2 } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#get-device": {
        input: { pathParams: { qrn: "qbraid:qbraid:sim:qir-sv" } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#get-device-calibration": {
        input: { pathParams: { qrn: "aws:aqt:qpu:ibex-q1" } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#list-providers": {
        input: {},
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#validate-qasm": {
        input: { body: { qasm: BELL } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#parse-qasm": {
        input: { body: { qasm: BELL } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#convert-qasm": {
        input: { body: { qasm: BELL, target_version: "3.0" } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#simulate-circuit": {
        input: { body: { qasm: BELL } },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#estimate-job-cost": {
        input: {
            queryParams: { deviceQrn: "aws:aqt:qpu:ibex-q1", shots: 100 },
        },
        usage: { credits: {}, evidence: {} },
    },
    "qbraid#submit-job": {
        input: {
            body: {
                deviceQrn: "qbraid:qbraid:sim:qir-sv",
                shots: 10,
                program: { format: "qasm2", data: BELL },
            },
        },
        usage: { credits: {}, evidence: { CREDIT: 0 } },
    },
};

const qbraidIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("qbraid#"))
        .sort();
};

Deno.test("qbraid: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await qbraidIds();
    assertEquals(ids.length, 10);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("qbraid: every endpoint's happy run settles its row", async () => {
    for (
        const [id, { input, fixture, status, usage }] of Object.entries(RATE)
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: await loadFixture(
                `${HERE}endpoints/${id.split("#")[1]}/fixtures/${
                    fixture ?? "happy"
                }.json`,
            ),
        });
        assertEquals(result.httpStatus, status ?? 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
    }
});

Deno.test("qbraid: fn provenance — one auth, one fromError, ONE pool; only submit-job meters, consolidates and owns start/poll/stop", async () => {
    const bundle = await testBundle();
    const ids = await qbraidIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        const billed = id === "qbraid#submit-job";
        // the pool narrows onto the ONE doc that drains it (D6)
        assertEquals(
            doc.usage.credits,
            billed ? { default: { label: "qBraid credits" } } : {},
            id,
        );
        assertEquals(doc.usage.model.kind, billed ? "PER_UNIT" : "FREE", id);
        assertEquals(doc.usage.consolidate !== undefined, billed, id);
        // the async run: the job QRN is held in state, never an input
        assertEquals(doc.lifecycle?.start !== undefined, billed, id);
        assertEquals(doc.lifecycle?.poll !== undefined, billed, id);
        assertEquals(doc.lifecycle?.stop !== undefined, billed, id);
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance ===
                "core#usage.synthesizedEmpty",
            !billed,
            id,
        );
    }
});
