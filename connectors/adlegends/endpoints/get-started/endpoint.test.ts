import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "adlegends#get_started";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = { body: { intent: "explore" as const } };

Deno.test(`${ID} happy (synthetic): FREE, structuredContent unwrapped`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-tool-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { ok: true, nextTool: "get_started" });
});

Deno.test(`${ID}: empty body is valid; unknown intent is INVALID_INPUT`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-tool-ok.json`);
    const ok = await runEndpoint({
        unit,
        input: { body: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { intent: "not-a-real-intent" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on ADLEGENDS_API_KEY)`,
    ignore: liveSkip("adlegends"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
