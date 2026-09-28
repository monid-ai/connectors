import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "adlegends#create_manual_brand";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = { body: { name: "Example — Test", requestId: "retry-1" } };

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
});

Deno.test(`${ID}: name and requestId required`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-tool-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { name: "Example — Test" } },
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
                input: { body: { requestId: "retry-1" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
