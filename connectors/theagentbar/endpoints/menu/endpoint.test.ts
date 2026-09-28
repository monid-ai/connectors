import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixtures = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const id = "theagentbar#api/menu";

Deno.test("theagentbar menu: preserves the public preview and never bills its prices", async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(`${fixtures}menu-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(await estimateEndpoint(unit, {}), {
        credits: {},
        evidence: {},
    });
});

Deno.test("theagentbar menu: preserves an upstream error and settles zero usage", async () => {
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${fixtures}synthetic-menu-unavailable.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "theagentbar menu: live public menu",
    ignore: liveSkip("theagentbar"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: {},
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(
            Array.isArray((result.output as Record<string, unknown>).menu),
            true,
        );
    },
});
