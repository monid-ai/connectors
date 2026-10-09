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
const ID = "qbraid#get-device-calibration";
const INPUT = { pathParams: { qrn: "aws:aqt:qpu:ibex-q1" } };

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
    assertEquals(output.data.provider, "aws");
    const qubits = output.data.qubits as Record<string, unknown>;
    assertEquals(Object.keys(qubits).length, 12);
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

Deno.test(`${ID}: a simulator has no calibration — 404 is data`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { qrn: "qbraid:qbraid:sim:qir-sv" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).code, "NOT_FOUND");
});

Deno.test(`${ID} schema gate: a near-valid bad input is INVALID_INPUT, its twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { qrn: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { pathParams: { qrn: "aws:aqt:qpu:ibex-q1" } },
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
            input: { pathParams: { qrn: "qbraid:qbraid:sim:qir-sv" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            true,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.message, "string");
        assertEquals(typeof output.code, "string");
    },
});
