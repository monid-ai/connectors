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
const ID = "contactout#v1/people/decision-makers/personal-email";

Deno.test(`${ID} happy (synthetic, reveal_info): 2 profiles, one personal email ⇒ 2 search + 1 email on the personal pools`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "contactout.com", reveal_info: true } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { search_personal: 2, email_personal: 1 },
        evidence: { profiles: 2, email_reveals: 1, phone_reveals: 0 },
    });
    // the evidence profile count IS the fixture's — counted off the
    // object-keyed-by-URL dialect, which is what live traffic answers (the
    // docs show an array; v1 under-billed by reading only the array) — and
    // the vendor's body rides out untouched (no output.fromResponse here)
    assertEquals(
        Object.keys(
            (result.output as { profiles: Record<string, unknown> }).profiles,
        ).length,
        2,
    );
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "contactout.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: at least one company identifier, as a compiled anyOf`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            // no identifier at all — none of the three anyOf arms matches
            { reveal_info: true },
            // a company URL that is not on the linkedin.com HOST
            { linkedin_url: "https://evil.example/?u=linkedin.com/company/x" },
            { domain: "contactout.com", unknown_key: 1 },
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
    // the near-twin: each of the three arms on its own is enough
    for (
        const ok of [
            { linkedin_url: "https://www.linkedin.com/company/contactout" },
            { domain: "contactout.com" },
            { name: "ContactOut" },
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
            // no reveal_info: the contact lines are structurally 0, which is
            // an invariant of the request, not a vendor amount
            input: { queryParams: { domain: "contactout.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.evidence.profiles, "number");
        // These zeros are NOT vendor amounts: no `reveal_info` was sent, so
        // the vendor does not populate contact_info at all and the reveal
        // lines are structurally unreachable. They cannot drift with vendor
        // data, and they are exactly the regression worth catching — a
        // reveal we never asked for is a reveal we would be billed for.
        assertEquals(result.usage.evidence.email_reveals, 0);
        assertEquals(result.usage.evidence.phone_reveals, 0);
    },
});
