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
const ID = "contactout#v1/people/linkedin/work-email";
const PROFILE = "https://www.linkedin.com/in/example-person";

Deno.test(`${ID} happy (synthetic): a work email, no phone ⇒ one email credit`, async () => {
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
        credits: { email_work: 1 },
        evidence: { email_found: 1, phone_found: 0 },
    });
    // The provider has no `output.fromResponse`, so the vendor body must
    // ride out WHOLE — deep-equalling the fixture's own recorded response
    // proves nothing was stripped and no billing field was stamped on (v1
    // stamped unit counters onto the output; v2 publishes usage.evidence).
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} phone-only (synthetic): email_type=none draws NO email credit — the measured draw, not v1's card base`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-phone-only.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                profile: PROFILE,
                email_type: "none",
                include_phone: true,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { phone_work: 1 },
        evidence: { email_found: 0, phone_found: 1 },
    });
});

Deno.test(`${ID} miss (synthetic 404): a profile without this key's email kind is free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: the personal email_type does not exist on the work key`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            { profile: PROFILE, email_type: "personal" },
            { profile: "https://twitter.com/example" },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: bad },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(bad),
        );
    }
    // the near-twin: this key's own vocabulary and the phone-only switch
    for (
        const ok of [
            { profile: PROFILE, email_type: "work" },
            { profile: PROFILE, email_type: "none", include_phone: true },
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
                },
            },
            mode: "live",
        });
        assertEquals(typeof result.httpStatus, "number");
    },
});
