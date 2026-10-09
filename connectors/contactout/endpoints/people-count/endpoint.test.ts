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
const ID = "contactout#v1/people/count";

Deno.test(`${ID} happy (recorded live): FREE — nothing folds, nothing is evidenced`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { job_title: ["CTO"], company: ["Stripe"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // The provider has no `output.fromResponse`, so the vendor body must
    // ride out WHOLE — deep-equalling the fixture's own recorded response
    // proves nothing was stripped and no billing field was stamped on (v1
    // stamped unit counters onto the output; v2 publishes usage.evidence).
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} schema gate: the search-only knobs (page, reveal_info, data_types) are not part of count`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (
        const bad of [
            { job_title: ["CTO"], page: 1 },
            { job_title: ["CTO"], reveal_info: true },
            { job_title: ["CTO"], data_types: ["phone"] },
            // the vendor states a FORMAT for years ranges and 400s on junk
            // ("must be in the format x_y") — the pattern stops it earlier
            { job_title: ["CTO"], years_of_experience: ["invalid"] },
            { job_title: ["CTO"], years_in_current_role: ["2-4"] },
            // an education filter with no field set cannot reach the wire
            { job_title: ["CTO"], educations: [{}] },
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
    // the near-twin: the shared filter set (minus the search-only knobs)
    for (
        const ok of [
            { job_title: ["CTO"], company: ["Stripe"] },
            { seniority: ["CXO"], location: ["London"] },
            // live-verified 2026-09-17: "6_10" and the bare open-ended "10"
            // are both accepted by the vendor
            { job_title: ["CTO"], years_of_experience: ["3_5", "10"] },
            { job_title: ["CTO"], educations: [{ school_name: "MIT" }] },
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
            input: { body: { job_title: ["CTO"], company: ["Stripe"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});

Deno.test(`${ID} provider error (synthetic 401): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { job_title: ["CTO"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 401);
    // FREE endpoints settle empty either way — the point is that a non-2xx
    // never reaches the fns at all
    assertEquals(result.usage, { credits: {}, evidence: {} });
});
