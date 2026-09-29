import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "orbit#v3/enrich/{profile_id}";
const PROFILE = "a23ff3b7-b6cc-4ac6-8d4f-0c909cd956f5";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { profile_id: PROFILE }, body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("orbit#v3/enrich/{profile_id}: a full build settles the 10 on its receipt", async () => {
    const result = await run("synthetic-enrich-built.json", {
        operation: "full",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // A full build includes its partial: 10, never 5 + 10.
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CREDIT: 10 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.generation_level, 3);
    assertEquals("billing" in output, false);
});

Deno.test("orbit#v3/enrich/{profile_id}: a no-op answers 202 and still settles ZERO", async () => {
    const result = await run("synthetic-enrich-noop.json", {
        operation: "full",
    });

    // Live drill, 2026-09-20: a profile already at level 3 answered
    // `202 running` with reservedCredits 0, then `completed` with
    // consumedCredits 0. A settle keyed on "202 means dispatched means
    // billed" charged 10 for it.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals(
        (result.output as Record<string, unknown>).generation_level,
        3,
    );
});

Deno.test("orbit#v3/enrich/{profile_id}: a submit-time failure reads like a poll-time one", async () => {
    const result = await run("synthetic-enrich-failed-on-submit.json", {
        operation: "full",
    });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "sources_unavailable");
    assertEquals(output.message, "No readable sources for this person");
});

Deno.test("orbit#v3/enrich/{profile_id}: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-enrich-provider-error.json", {
        operation: "partial",
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("orbit#v3/enrich/{profile_id} estimate: the depth asked for, and the budget for it", async () => {
    // From Orbit's published card, version 2026-09-17: partial_profile 5,
    // full_profile 10; `regenerate` is a full build.
    const unit = await testSealedUnit(ID);
    const estimate = (operation: string) =>
        estimateEndpoint(unit, {
            pathParams: { profile_id: PROFILE },
            body: { operation },
        });
    assertEquals((await estimate("partial")).credits, { default: 5 });
    assertEquals((await estimate("full")).credits, { default: 10 });
    assertEquals((await estimate("regenerate")).credits, { default: 10 });
    // `full` and `regenerate` were measured at 24 to 27 minutes.
    assert(unit.doc.timeouts.runMs >= 27 * 60_000);
});

Deno.test("orbit#v3/enrich/{profile_id}: the gate rejects an unknown operation, and passes `full`", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-enrich-built.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { profile_id: PROFILE },
                    body: { operation: "deep" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "full" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "orbit#v3/enrich/{profile_id} live: a partial build settles on Orbit's receipt",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { profile_id: PROFILE },
                body: { operation: "partial" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
        assert("status" in (result.output as Record<string, unknown>));
    },
});
