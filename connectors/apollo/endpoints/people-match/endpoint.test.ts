import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apollo#people/match";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    queryParams: {
        first_name: "Jordan",
        last_name: "Blake",
        domain: "example.com",
    },
};

Deno.test(`${ID} happy (synthetic): a high-confidence match bills one credit`, async () => {
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
        (result.output as { person: { match_confidence: string } }).person
            .match_confidence,
        "high",
    );
});

Deno.test(`${ID} no match (synthetic): match_confidence none and no email draws nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-no-match.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "nobody@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} email at confidence none (synthetic): the email credit still bills`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-no-match.json`);
    // Apollo's rule: email credit usage is not determined by match_confidence
    (fixture.calls[0].res.body as { person: { email: string | null } }).person
        .email = "nobody@example.com";
    const result = await runEndpoint({
        unit,
        input: { queryParams: { email: "nobody@example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
});

Deno.test(`${ID} provider error (synthetic 403 API_INACCESSIBLE): zero usage`, async () => {
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
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: an identifier is required and the asynchronous channels are closed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (queryParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: queryParams as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            // a modifier alone is not an identifier
            { reveal_personal_emails: true },
            {},
            // the phone/waterfall/webhook channels are not carried (D2)
            { ...INPUT.queryParams, reveal_phone_number: true },
            { ...INPUT.queryParams, poll_only: true },
            { ...INPUT.queryParams, run_waterfall_email: true },
            { ...INPUT.queryParams, webhook_url: "https://example.com/hook" },
            // vendor formats: an MD5/SHA-256 hash, an http(s) LinkedIn URL
            { hashed_email: "not-a-hash" },
            { linkedin_url: "linkedin.com/in/jordan-blake" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twins pass validation (they fail later, at replay URL
    // matching — proving the gate let them through)
    for (
        const good of [
            { email: "jordan@example.com", reveal_personal_emails: true },
            { hashed_email: "8d935115b9ff4489f2d1f9249503cadf" },
            { linkedin_url: "https://www.linkedin.com/in/jordan-blake" },
        ]
    ) {
        const error = await assertRejects(() => run(good));
        assertEquals(
            String(error).includes("INVALID_INPUT"),
            false,
            String(error),
        );
    }
});

Deno.test({
    name: `${ID} live (gated on APOLLO_API_KEY)`,
    ignore: liveSkip("apollo"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            // a public figure at a public company (placeholder identity
            // convention): Apollo.io's CEO
            input: {
                queryParams: { name: "Tim Zheng", domain: "apollo.io" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            Object.prototype.toString.call(
                (result.output as Record<string, unknown>).person,
            ),
            "[object Object]",
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
