import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "qbraid#simulate-circuit";
const INPUT = {
    body: {
        qasm:
            'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;\n',
    },
};

Deno.test(`${ID} happy: free, envelope passes through`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown> & {
        data: Record<string, unknown>;
    };
    assertEquals(output.success, true);
    assertEquals(output.data.num_qubits, 2);
    const probabilities = output.data.probabilities as Record<string, number>;
    assertEquals(Object.keys(probabilities).sort(), ["00", "11"]);
});

Deno.test(`${ID} provider error: 401 is data, zero usage, digested`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Invalid API key format");
    assertEquals(output.code, "INVALID_API_KEY_FORMAT");
});

Deno.test(`${ID} schema gate: a near-valid bad input is INVALID_INPUT, its twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { qasm: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: `${ID} live (gated on QBRAID_CREDENTIALS_API_KEY): response shape`,
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
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown> & {
            data: Record<string, unknown>;
        };
        assertEquals(output.success, true);
        assertEquals(typeof output.data.probabilities, "object");
        assertEquals(typeof output.data.num_qubits, "number");
    },
});
