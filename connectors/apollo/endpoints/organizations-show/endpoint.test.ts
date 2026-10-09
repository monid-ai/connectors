import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apollo#organizations/show";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { pathParams: { id: "ORG1" } };

Deno.test(`${ID} happy (synthetic): one record bills one credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (result.output as { organization: { primary_domain: string } })
            .organization.primary_domain,
        "apollo.io",
    );
});

Deno.test(`${ID} provider error (synthetic 422, bad id): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "not-an-id" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the id is required and nothing else is accepted`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (pathParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { pathParams: pathParams as Record<string, string> },
            mode: "replay",
            fixture,
        });
    for (const bad of [{}, { id: "" }, { id: "ORG1", extra: "x" }]) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes validation (it fails later, at replay URL
    // matching — proving the gate let it through)
    const error = await assertRejects(() => run({ id: "ORG2" }));
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: `${ID} live (gated on APOLLO_API_KEY)`,
    ignore: liveSkip("apollo"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            // Apollo.io's own organization id, from its reference examples
            input: { pathParams: { id: "5e66b6381e05b4008c8331b8" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            Object.prototype.toString.call(
                (result.output as Record<string, unknown>).organization,
            ),
            "[object Object]",
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
