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
const ID = "qbraid#estimate-job-cost";
const INPUT = { queryParams: { deviceQrn: "aws:aqt:qpu:ibex-q1", shots: 100 } };

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
    assertEquals(output.data, {
        pricingAvailable: true,
        estimatedCost: 265,
        deviceQrn: "aws:aqt:qpu:ibex-q1",
        shots: 100,
    });
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
                input: {
                    queryParams: { deviceQrn: "aws:aqt:qpu:ibex-q1", shots: 0 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: { deviceQrn: "aws:aqt:qpu:ibex-q1", shots: 1 } },
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
            input: {
                queryParams: {
                    deviceQrn: "qbraid:qbraid:sim:qir-sv",
                    shots: 10,
                },
            },
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
        assertEquals(typeof output.data.pricingAvailable, "boolean");
        assertEquals(output.data.deviceQrn, "qbraid:qbraid:sim:qir-sv");
    },
});
