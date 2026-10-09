import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { CONTACTOUT_KEYS } from "../../schema/auth.ts";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "contactout#v1/people/person";

Deno.test(`${ID} happy (synthetic): a hit is one flat work email credit — the engine appends the CALL`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "person@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { email_work: 1 },
        evidence: { CALL: 1 },
    });
    // the vendor body rides out whole: one resolved profile, and no billing
    // field was ever added to it (v1 stamped unit counters onto the output;
    // v2 publishes them as usage.evidence instead)
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.profile as { linkedin: string }).linkedin,
        "https://www.linkedin.com/in/example-person",
    );
    for (const billing of ["work_email_units", "phone_units", "search_units"]) {
        assertEquals(output[billing], undefined, billing);
    }
});

Deno.test(`${ID} miss (synthetic 404): zero-billed — the flat line never fires on a non-2xx`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "nobody@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: a malformed address is rejected before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { email: "person-at-example.com" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin: a well-formed address passes
    await assertInputAccepted({
        unit,
        input: { queryParams: { email: "person@example.com" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: `${ID} live (gated on the contactout credentials)`,
    ignore: liveSkip("contactout", CONTACTOUT_KEYS),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { email: "billg@microsoft.com" } },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
    },
});
