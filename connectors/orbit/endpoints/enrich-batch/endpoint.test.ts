import { assert, assertEquals, assertRejects } from "@std/assert";
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
const ID = "orbit#v3/enrich";

Deno.test("orbit#v3/enrich: the batch settles the SUM of its children's receipts", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: { profile_ids: ["PROF_A", "PROF_B"], operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-enrich-batch.json`),
    });

    // One child built (receipt 5); the other completed on the submit with
    // no receipt and no `links.status`. Child ids are `{parent}:{profile_id}`
    // — the chain's urls carry them URL-encoded, so an unencoded path fails
    // the replay.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.request_id, "BATCH1");
    assertEquals(output.status, "completed");
    const rows = output.results as Record<string, unknown>[];
    assertEquals(rows.length, 2);
    assertEquals(rows[0].request_id, "BATCH1:PROF_A");
    assertEquals(rows[1].request_id, "BATCH1:PROF_B");
    // Each child keeps its own receipt as provenance.
    assertEquals(
        (rows[0].billing as Record<string, unknown>).consumedCredits,
        5,
    );
    assertEquals("billing" in rows[1], false);
});

Deno.test("orbit#v3/enrich: a vendor refusal of the batch is zero-billed data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { profile_ids: ["PROF_A"], operation: "full" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-provider-error.json`),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("orbit#v3/enrich: a transient FINAL read re-opens the child instead of failing it", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: { profile_ids: ["PROF_A", "PROF_B"], operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-batch-final-transient.json`,
        ),
    });

    // A `failed` row published on a 503 would carry no receipt, settling a
    // build Orbit charged for at zero.
    assertEquals(result.httpStatus, 200);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals((output.results as unknown[]).length, 2);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
});

Deno.test("orbit#v3/enrich estimate: the list, at the depth asked for", async () => {
    const unit = await testSealedUnit(ID);
    const estimate = await estimateEndpoint(unit, {
        body: {
            profile_ids: ["PROF_A", "PROF_B", "PROF_C"],
            operation: "full",
        },
    });
    assertEquals(estimate.credits, { default: 30 });
    // A batch child at full depth was measured at 27 minutes.
    assert(unit.doc.timeouts.runMs >= 27 * 60_000);
});

Deno.test("orbit#v3/enrich: the gate rejects a 21st profile, and passes 20", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-enrich-batch.json`);
    const ids = (count: number) =>
        Array.from({ length: count }, (_unused, index) => `PROF_${index}`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { profile_ids: ids(21), operation: "partial" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: { profile_ids: ids(20), operation: "partial" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "orbit#v3/enrich live: a one-profile batch settles on Orbit's receipts",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    profile_ids: ["a23ff3b7-b6cc-4ac6-8d4f-0c909cd956f5"],
                    operation: "partial",
                },
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
        const output = result.output as Record<string, unknown>;
        assert("status" in output);
        assertEquals((output.results as unknown[]).length, 1);
    },
});
