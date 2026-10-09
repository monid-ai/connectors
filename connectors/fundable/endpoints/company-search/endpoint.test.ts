import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("fundable#company/search empty (synthetic): zero candidates still bill the 0.1-credit search (v1 drill)", async () => {
    const unit = await testSealedUnit("fundable#company/search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { name: "zzzz-no-such-company" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the ONE credit system (rate card: searches 0.1 credit/call,
    // charged on zero results): the provider consolidate claims the
    // response's own 0.1 stamp, which matches the doc's 0.1 fold — no
    // mismatch
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals(output.meta, { total_count: 0 });
});
