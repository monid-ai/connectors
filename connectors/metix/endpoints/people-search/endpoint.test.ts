import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const text = "python backend engineer with 5 years experience in shanghai";

Deno.test("metix#v1/people-search happy (synthetic): base 5 plus one block", async () => {
    const unit = await testSealedUnit("metix#v1/people-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-search-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { text, size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 5 + ceil(2 / 25) = 6. The flat component's quantity is the engine's
    // to append: the fn reports only the metered line.
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { ai_search_base: 1, profile_ids: 2 },
    });
});

Deno.test("metix#v1/people-search empty (synthetic): the base is STILL charged", async () => {
    const unit = await testSealedUnit("metix#v1/people-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-search-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { text: "zzqxv no such person anywhere", size: 25 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // This route's quota block is chargeOn 2xx, NOT
    // 2xx_with_non_empty_result: the AI-search base is drawn even when the
    // answer is empty. It is the one place a Metix search is not free when
    // it matches nothing, and the structured search at
    // metix#v1/people/query is the free alternative.
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { ai_search_base: 1, profile_ids: 0 },
    });
    const data = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >;
    assertEquals(data.profile_ids, []);
});

Deno.test("metix#v1/people-search provider error (401): zero usage, base not drawn", async () => {
    const unit = await testSealedUnit("metix#v1/people-search");
    const fixture = await loadFixture(
        `${fixturesDir}recorded-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { text, size: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    // A flat line is drawn once per SUCCESSFUL run, so an error settles
    // nothing at all, base included.
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("metix#v1/people-search: the schema gate — text bounds, size required, strict", async () => {
    const unit = await testSealedUnit("metix#v1/people-search");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-people-search-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { text },
        { text: "", size: 2 },
        { text: "x".repeat(5001), size: 2 },
        { text, size: 0 },
        { text, size: 10001 },
        { text, size: 2, where: {} as Json },
        { text, size: 2, after: "x" },
        { where: {} as Json, size: 2 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 120),
        );
    }
    const passing: Json[] = [
        { text: "x", size: 1 },
        { text: "x".repeat(5000), size: 1 },
        { text, size: 10000 },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(
            ok.isProviderError,
            false,
            JSON.stringify(body).slice(0, 80),
        );
    }
});

Deno.test({
    name: "metix#v1/people-search live (gated on METIX_CREDENTIALS_API_KEY)",
    ignore: liveSkip("metix"),
    fn: async () => {
        const unit = await testSealedUnit("metix#v1/people-search");
        const result = await runEndpoint({
            unit,
            input: { body: { text, size: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), [
            "ai_search_base",
            "profile_ids",
        ]);
        assertEquals(result.usage.evidence.ai_search_base, 1);
        // The base is 5 whatever comes back, so the floor is 5.
        assertEquals(result.usage.credits.default >= 5, true);
    },
});
