import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const query = "Is there evidence for this purchase decision?";

Deno.test("powder#evidence: native V2 gap response is retained and one call metered", async () => {
    const unit = await testSealedUnit("powder#evidence");
    const fixture = await loadFixture(`${fixturesDir}synthetic-gap.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.evidence_available, false);
    assertEquals(output.evidence, []);
    assertEquals(output.results_returned, 0);
    assertEquals((output.coverage as { state: string }).state, "gap");
    assertEquals(
        (output.evidence_score as { score: number | null }).score,
        null,
    );
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("powder#evidence: invalid input fails before transport", async () => {
    const unit = await testSealedUnit("powder#evidence");
    const fixture = await loadFixture(`${fixturesDir}synthetic-gap.json`);
    const invalidBodies: Array<Record<string, string | number>> = [
        {},
        { query: "" },
        { query, limit: 11 },
        { query, payment_status: "paid" },
        { query, apiKey: "caller-supplied-test-key" },
    ];
    for (const body of invalidBodies) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test("powder#evidence: upstream failure returns no metered usage", async () => {
    const unit = await testSealedUnit("powder#evidence");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { error: "evidence_database_unavailable" });
});

Deno.test("powder#evidence: discoverable contract preserves V2 body and pricing", async () => {
    const unit = await testSealedUnit("powder#evidence");
    assertEquals(unit.doc.request.method, "POST");
    assertEquals(
        unit.doc.request.url,
        "https://data.dubbleblack.com/api/agent/evidence/v2",
    );
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assertEquals("query" in properties, true);
    assertEquals("context" in properties, true);
    assertEquals("confidence_score" in properties, false);
    assertEquals(unit.doc.usage.credits, { default: { label: "US dollars" } });
    assertEquals(unit.doc.usage.model, {
        kind: "PER_CALL",
        label: "successful Evidence V2 call",
        consumes: { credit: "default", amount: 0.10 },
    });
});

Deno.test("powder#evidence: dedicated credentials are provider-side, not caller input", async () => {
    const unit = await testSealedUnit("powder#evidence");
    const credentials = unit.doc.auth.credentials;
    assertEquals(credentials.required, ["apiKey"]);
    assertEquals(
        (credentials.properties as Record<string, { type: string }>).apiKey
            .type,
        "string",
    );
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assertEquals("apiKey" in properties, false);
});
