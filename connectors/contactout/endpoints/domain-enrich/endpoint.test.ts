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
const ID = "contactout#v1/domain/enrich";

Deno.test(`${ID} happy (synthetic, companies as an OBJECT keyed by domain): 3 asked, 2 found ⇒ 2 search credits`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                domains: ["contactout.com", "example.com", "nomatch.invalid"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { search_work: 2 },
        evidence: { RESULT: 2 },
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
        input: { body: { domains: ["contactout.com"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: 1-30 domains, nothing else`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    for (
        const bad of [
            { domains: [] },
            { domains: Array.from({ length: 31 }, (_, i) => `d${i}.com`) },
            { domains: ["a.com"], page: 1 },
            {},
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
    // the near-twin: 1 and the 30-domain cap both pass
    for (
        const ok of [
            { domains: ["contactout.com"] },
            { domains: Array.from({ length: 30 }, (_, i) => `d${i}.example`) },
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
            input: { body: { domains: ["contactout.com"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amount: whether a live domain still matches is the
        // vendor's data, so the COUNT can legitimately change
        assertEquals(typeof result.usage.evidence.RESULT, "number");
    },
});
