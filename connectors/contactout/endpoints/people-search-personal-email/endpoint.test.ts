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
const ID = "contactout#v1/people/search/personal-email";

Deno.test(`${ID} happy (synthetic, profiles as an ARRAY, no reveal): 2 search credits on the personal pool, no reveals`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { job_title: ["CTO"], page_size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { search_personal: 2 },
        evidence: { profiles: 2, email_reveals: 0, phone_reveals: 0 },
    });
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_title: ["CTO"], page_size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: page_size is REQUIRED and capped at 25; the work key's data_types is rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            // page_size is the estimate's whole basis, so the caller states it
            { job_title: ["CTO"] },
            { job_title: ["CTO"], page_size: 26 },
            { job_title: ["CTO"], page_size: 2, data_types: ["work_email"] },
            { job_title: ["CTO"], page_size: 2, unknown_key: 1 },
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
    // the near-twin: this key's own vocabulary and the boundary page size
    for (
        const ok of [
            {
                job_title: ["CTO"],
                page_size: 25,
                data_types: ["personal_email", "phone"],
                reveal_info: true,
            },
            { job_title: ["CTO"], page_size: 1 },
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
            // no reveal_info ⇒ the contact lines are structurally 0
            input: { body: { job_title: ["CTO"], page_size: 2 } },
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
