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
const ID = "contactout#v1/people/linkedin/work_email_status";
const PROFILE = "https://www.linkedin.com/in/example-person";

Deno.test(`${ID} happy (recorded live): FREE flag`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { profile: PROFILE } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the checker answers the flag under a bare `email` key with an
    // `email_status` verdict — the key kind is the ACCOUNT's, not the
    // field's (recorded live 2026-09-17; the synthetic fixture this replaced
    // invented a `work_email` field the vendor does not send)
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: only a LinkedIn profile URL`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    queryParams: { profile: "https://github.com/example" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin: regional subdomains and /pub/ profiles are legal
    for (
        const ok of [
            "https://uk.linkedin.com/in/example-person",
            "https://www.linkedin.com/pub/example-person",
        ]
    ) {
        await assertInputAccepted({
            unit,
            input: { queryParams: { profile: ok } },
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
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // shape: the checker answers a boolean flag, whichever way it falls
        const profile = (result.output as { profile: Record<string, unknown> })
            .profile;
        assertEquals(typeof profile.email, "boolean");
    },
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
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
