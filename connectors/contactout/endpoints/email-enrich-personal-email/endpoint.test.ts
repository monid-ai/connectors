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
const ID = "contactout#v1/email/enrich/personal-email";

Deno.test(`${ID} happy (synthetic): a personal address, no phone ⇒ one personal email credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "person@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { email_personal: 1 },
        evidence: { email_found: 1, phone_found: 0, profile_only: 0 },
    });
});

Deno.test(`${ID} miss (synthetic 404): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "person@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: the work-only include switch does not exist on the personal key`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    queryParams: {
                        email: "person@example.com",
                        include: "work_email",
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin: the bare address — this key's whole vocabulary — passes
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
        // shape only: a hit is the vendor's call, a 404 miss is legal data
        assertEquals(typeof result.httpStatus, "number");
    },
});
