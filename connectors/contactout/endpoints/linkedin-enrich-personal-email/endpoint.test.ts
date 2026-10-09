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
const ID = "contactout#v1/linkedin/enrich/personal-email";
const PROFILE = "https://www.linkedin.com/in/example-person";

// The counting and schema gates are the work twin's (one interned fn each,
// pinned in its test); what is specific here is the POOL — the same hit
// shape settles on the personal account.
Deno.test(`${ID} happy (synthetic): a personal email, no phone ⇒ one personal email credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { email_personal: 1 },
        evidence: { email_found: 1, phone_found: 0, profile_only: 0 },
    });
    // The provider has no `output.fromResponse`, so the vendor body must
    // ride out WHOLE — deep-equalling the fixture's own recorded response
    // proves nothing was stripped and no billing field was stamped on (v1
    // stamped unit counters onto the output; v2 publishes usage.evidence).
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: `${ID} live (gated on the contactout credentials)`,
    ignore: liveSkip("contactout", CONTACTOUT_KEYS),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    profile: "https://www.linkedin.com/in/williamhgates",
                    profile_only: true,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});

Deno.test(`${ID} schema gate: company URLs and hidden hosts are rejected before the metered call; real profile URLs pass`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            "https://www.linkedin.com/company/contactout",
            // linkedin.com must be the HOSTNAME, not a substring
            "https://evil.example/?u=linkedin.com/in/example-person",
            "https://notlinkedin.com/in/example-person",
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: { profile: bad } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            bad,
        );
    }
    // the near-twin: regional subdomains and /pub/ profiles are legal, and
    // so is the optional profile_only knob
    for (
        const ok of [
            { profile: "https://uk.linkedin.com/in/example-person" },
            { profile: "https://www.linkedin.com/pub/example-person" },
            { profile: PROFILE, profile_only: true },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { queryParams: ok },
            mode: "replay",
            fixture,
        });
    }
});
