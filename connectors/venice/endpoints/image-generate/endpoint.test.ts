import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "venice#image/generate";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body = {
    model: "venice-sd35",
    prompt: "a red fox in snow, watercolor",
    width: 512,
    height: 512,
    format: "webp",
    variants: 1,
};

Deno.test(`${ID} happy (recorded): one image on the $0.01 line`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}image-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { img_001: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.images as unknown[]).length, 1);
});

Deno.test(`${ID} schema gate: tiered and unknown models are rejected, binary is not exposed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}image-ok.json`);
    // resolution-tiered — deliberately not carried by this rate card
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...body, model: "nano-banana-2" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...body, variants: 5 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on VENICE_API_KEY)`,
    ignore: liveSkip("venice"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { img_001: 1 });
    },
});
