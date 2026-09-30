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

Deno.test("project-room#public-work/tasks happy (synthetic): free — zero usage, page rides through", async () => {
    const unit = await testSealedUnit("project-room#public-work/tasks");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { limit: 2 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    const tasks = output.tasks as Record<string, unknown>[];
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0].schema, "public-work-task/1");
    assertEquals(output.nextCursor, "pwt_01JABC");
});

Deno.test("project-room#public-work/tasks provider error: 503 is data, zero usage", async () => {
    const unit = await testSealedUnit("project-room#public-work/tasks");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { limit: 2 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("project-room#public-work/tasks schema gate: limit is positive", async () => {
    const unit = await testSealedUnit("project-room#public-work/tasks");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    // near-valid bad input: below the documented floor
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { limit: 0 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // passing near-twin clears the gate
    await assertInputAccepted({
        unit,
        input: { queryParams: { limit: 2 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "project-room#public-work/tasks live",
    ignore: liveSkip("project-room"),
    fn: async () => {
        const unit = await testSealedUnit("project-room#public-work/tasks");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert(
            Array.isArray(
                (result.output as Record<string, unknown>).tasks,
            ),
        );
    },
});
