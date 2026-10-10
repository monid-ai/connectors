import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "anymailfinder#find-email/person";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { body: { domain: "example.com", full_name: "Jane Doe" } };

/** The vendor's meter is lifted out of the output (provider consolidate). */
const withoutMeter = (body: Json): Json => {
    const { credits_charged: _meter, ...rest } = body as Record<string, Json>;
    return rest;
};

const run = async (fixtureName: string, input: RunInput = INPUT) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${fixtureName}.json`),
    });

Deno.test(`${ID} happy (synthetic): a verified address: 1 credit`, async () => {
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await run("synthetic-happy");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, withoutMeter(fixture.calls[0].res.body));
});

Deno.test(`${ID} a miss (200, not_found) (synthetic): free`, async () => {
    const result = await run("synthetic-miss");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} a risky result (address in email, not valid_email) (synthetic): free`, async () => {
    const result = await run("synthetic-risky");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, the {error, message} envelope digested`, async () => {
    const result = await run("synthetic-provider-error");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string; error_code: string };
    assertEquals(output.error_code, "unauthorized");
    assertEquals(output.message, "Missing or invalid API key.");
});

Deno.test(`${ID}: the schema gate - the vendor's rules and strictness`, async () => {
    for (
        const bad of [
            {},
            { domain: "example.com" },
            { full_name: "Jane Doe" },
            { domain: "example.com", first_name: "Jane" },
            { linkedin_url: "x", phone: "1" },
        ]
    ) {
        await assertRejects(
            () => run("synthetic-happy", { body: bad as Record<string, Json> }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: `${ID} live (gated on ANYMAILFINDER_API_KEY)`,
    ignore: liveSkip("anymailfinder"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(
            ["valid", "risky", "not_found", "blacklisted"].includes(
                output.email_status as string,
            ),
            true,
        );
        assertEquals(
            output.valid_email === null ||
                typeof output.valid_email === "string",
            true,
        );
        assertEquals("credits_charged" in output, false);
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        for (const amount of Object.values(result.usage.credits)) {
            assertEquals(typeof amount, "number");
        }
    },
});
