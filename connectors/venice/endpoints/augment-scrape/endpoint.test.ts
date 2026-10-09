import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "venice#augment/scrape";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): flat $0.01, markdown content`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}scrape-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.format, "markdown");
    assertEquals(typeof output.content, "string");
});

Deno.test(`${ID} blocked site (recorded 400): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://x.com/venice_ai" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}scrape-blocked.json`),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.message as string).includes("blocks automated access"),
        true,
    );
});

Deno.test(`${ID} provider error (recorded 401): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com" } },
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
        input: { body: { url: "https://example.com" } },
        mode: "replay",
        fixture: {
            name: "synthetic-augment-scrape-rate-limited",
            description: "A Venice 429 must not bill scrape usage.",
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

Deno.test(`${ID} schema gate: a non-URL is rejected before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { url: "not a url" } },
                mode: "replay",
                fixture: {
                    name: "unused",
                    description: "never reached",
                    calls: [],
                },
            }),
        Error,
        "INVALID_INPUT",
    );
    // Passing near-twin: a different valid https URL clears the gate.
    const accepted = await estimateEndpoint(unit, {
        body: { url: "https://example.org/valid-page" },
    });
    assertEquals(accepted.evidence, { CALL: 1 });
});

Deno.test({
    name: `${ID} live (gated on VENICE_API_KEY)`,
    ignore: liveSkip("venice"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assertEquals(output.format, "markdown");
    },
});
