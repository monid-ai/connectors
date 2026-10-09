import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "mrscraper#scrape/extract";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: { url: "https://example.com", prompt: "Extract the page title." },
};

Deno.test(`${ID} happy (synthetic): bills the vendor's token meter, internals stripped`, async () => {
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
        credits: { default: 12 },
        evidence: { TOKEN: 12 },
    });
    const {
        token_usage: _meter,
        residential_proxy_usage: _proxy,
        data_path: _d,
        html_path: _h,
        ...body
    } = fixture.calls[0].res.body as Record<string, Json>;
    assertEquals(result.output, body);
});

Deno.test(`${ID} provider error (synthetic 400): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the agent cannot be chosen by the caller; options are gated`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (body: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: body as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            { url: "https://example.com", agent: "listing" },
            { url: "https://example.com", prompt: "" },
            { url: "https://example.com", timeout: 0 },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin passes the gate and replays the happy chain (a body
    // field does not change the wire URL)
    const twin = await run({ url: "https://example.com" });
    assertEquals(twin.httpStatus, 200);
});

Deno.test({
    name: `${ID} live (gated on MRSCRAPER_API_KEY)`,
    ignore: liveSkip("mrscraper"),
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
        assertEquals(Object.keys(result.usage.evidence), ["TOKEN"]);
    },
});
