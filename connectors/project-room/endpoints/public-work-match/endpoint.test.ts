import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("project-room#public-work/match happy (synthetic): free — zero usage, recommendations ride through", async () => {
    const unit = await testSealedUnit("project-room#public-work/match");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { interests: ["documentation"], limit: 1 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    const recs = output.recommendations as Record<string, unknown>[];
    assertEquals(recs.length, 1);
    assertEquals(output.claim, null);
    assertEquals(output.supportedRewards, ["volunteer"]);
});

Deno.test("project-room#public-work/match provider error: 500 is data, zero usage", async () => {
    const unit = await testSealedUnit("project-room#public-work/match");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { interests: ["documentation"], limit: 1 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("project-room#public-work/match schema gate: limit cap 5", async () => {
    const unit = await testSealedUnit("project-room#public-work/match");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    // near-valid bad input: one past the documented max
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: { interests: ["documentation"], limit: 6 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // passing near-twin clears the gate
    await assertInputAccepted({
        unit,
        input: { body: { interests: ["documentation"], limit: 5 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "project-room#public-work/match live",
    ignore: liveSkip("project-room"),
    fn: async () => {
        const unit = await testSealedUnit("project-room#public-work/match");
        const result = await runEndpoint({
            unit,
            input: { body: { interests: ["documentation"], limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(
            Array.isArray(
                (result.output as Record<string, unknown>).recommendations,
            ),
        );
    },
});
