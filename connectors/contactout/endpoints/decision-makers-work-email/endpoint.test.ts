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
const ID = "contactout#v1/people/decision-makers/work-email";

Deno.test(`${ID} happy (synthetic): two decision makers, no reveal ⇒ 2 search credits`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "contactout.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { search_work: 2 },
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
        input: { queryParams: { domain: "contactout.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: at least one company identifier, as a compiled anyOf`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            {},
            { page: 1 },
            { linkedin_url: "https://www.linkedin.com/in/a-person" },
            { domain: "contactout.com", bogus: 1 },
            // linkedin.com outside the hostname (CodeQL js/incomplete-hostname-regexp)
            {
                linkedin_url:
                    "https://evil.example/?u=linkedin.com/company/acme",
            },
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
    // the rule survives compilation as three one-key arms (clay D13 form)
    const schema = unit.doc.input.schema.queryParams as {
        anyOf?: { required?: string[] }[];
    };
    assertEquals(
        schema.anyOf?.map((arm) => arm.required),
        [["linkedin_url"], ["domain"], ["name"]],
    );
    // the near-twin: each of the three anyOf arms is enough on its own
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
            input: { queryParams: { domain: "contactout.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
