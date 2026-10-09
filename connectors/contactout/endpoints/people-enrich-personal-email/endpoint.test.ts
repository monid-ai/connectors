import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { CONTACTOUT_KEYS } from "../../schema/auth.ts";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "contactout#v1/people/enrich/personal-email";
const PROFILE = "https://www.linkedin.com/in/example-person";

Deno.test(`${ID} happy (synthetic): match + personal email on the personal pools (v1 test: 0.018 + 0.17)`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { linkedin_url: PROFILE, include: ["personal_email"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { search_personal: 1, email_personal: 1 },
        evidence: { profile_matched: 1, email_found: 1, phone_found: 0 },
    });
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { linkedin_url: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: the work key's include value is rejected, this key's own passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            { linkedin_url: PROFILE, include: ["work_email"] },
            { linkedin_url: PROFILE, unknown_key: 1 },
            { linkedin_url: "https://github.com/example" },
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
    // the near-twin: this key's own vocabulary, and the other identifiers
    for (
        const ok of [
            { linkedin_url: PROFILE, include: ["personal_email", "phone"] },
            { email: "person@example.com" },
            { full_name: "A Person", company: ["ContactOut"] },
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
    name: `${ID} live (gated on the contactout credentials)`,
    ignore: liveSkip("contactout", CONTACTOUT_KEYS),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    linkedin_url: "https://www.linkedin.com/in/williamhgates",
                },
            },
            mode: "live",
        });
        // shape only — a match is the vendor's call, not an invariant
        assertEquals(typeof result.httpStatus, "number");
    },
});
