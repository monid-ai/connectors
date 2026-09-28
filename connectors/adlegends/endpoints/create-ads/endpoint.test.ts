import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "adlegends#create_ads";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    body: {
        brandId: 1,
        targetAudience: "independent shop owners",
        keyMessage: "looks legendary, priced like Tuesday",
        tone: "bold",
        pack_type: "meta" as const,
    },
};

Deno.test(`${ID} happy (synthetic)`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-tool-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const required = unit.doc.input.schema.body?.required as string[];
    assertEquals(
        new Set(required),
        new Set(["brandId", "targetAudience", "keyMessage", "tone"]),
    );
});

Deno.test(`${ID}: strategy fields required; unknown pack_type refused`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-tool-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { brandId: 1, tone: "bold" } },
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
                input: {
                    body: {
                        ...INPUT.body,
                        pack_type: "billboard",
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
