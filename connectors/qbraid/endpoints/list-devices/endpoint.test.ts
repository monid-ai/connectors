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
const ID = "qbraid#list-devices";
const INPUT = { queryParams: { deviceType: "QPU", limit: 2 } };

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
    const devices = output.data as unknown as Record<string, unknown>[];
    assertEquals(devices.length, 2);
    assertEquals(devices[0].qrn, "aws:aqt:qpu:ibex-q1");
    assertEquals(devices[0].deviceType, "QPU");
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
                input: { queryParams: { limit: 0 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { queryParams: { limit: 1 } },
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
        const devices = output.data as unknown as Record<string, unknown>[];
        assertEquals(Array.isArray(devices), true);
        assertEquals(typeof devices[0]?.qrn, "string");
        assertEquals(typeof devices[0]?.status, "string");
    },
});
