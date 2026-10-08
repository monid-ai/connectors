import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
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

Deno.test(`${ID} provider error (recorded 401): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Authentication failed");
});

Deno.test(`${ID} provider error (429): no usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: {
            name: "synthetic-image-generate-rate-limited",
            description: "A Venice 429 must not bill image generation usage.",
            calls: [{
                req: { method: "POST", url: unit.doc.request.url },
                res: { status: 429, body: { error: "rate limit exceeded" } },
            }],
        },
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "rate limit exceeded");
});

Deno.test(`${ID} schema gate: tiered and unknown models are rejected, the max variants pass`, async () => {
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
    // near-twin: variants 4 (the cap) passes the gate and holds 4 images;
    // the recorded single image settles as one — evidence counts what
    // came back, not what was asked for
    const accepted = await estimateEndpoint(unit, {
        body: { ...body, variants: 4 },
    });
    assertEquals(accepted.evidence, { img_001: 4 });
    const ok = await runEndpoint({
        unit,
        input: { body: { ...body, variants: 4 } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
    assertEquals(ok.usage.evidence, { img_001: 1 });
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
