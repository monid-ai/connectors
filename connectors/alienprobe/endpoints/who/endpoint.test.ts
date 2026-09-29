import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "alienprobe#who";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/** Opt-in live gate — this provider has no credential (x402). */
const liveOff = Deno.env.get("ALIENPROBE_LIVE") !== "1";

// synthetic-who-ok.json: no paid recording exists, so by the repo's rule it
// is `synthetic-`; its bytes are the seller's own bazaar output example,
// copied verbatim from the live 402 PAYMENT-REQUIRED header — not invented.
Deno.test(`${ID} happy (synthetic: seller-declared 402 example): flat $0.05, match rule + website`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "apple.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-who-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.05 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, any>;
    assertEquals(output.schema_version, "who-lookup.v1");
    assertEquals(output.answer.lei, "HWUPKR0MPOU8FGXBT394");
    assertEquals(output.answer.match, { by: "domain", rule: "domain_exact" });
    assertEquals(output.answer.official_website, "https://apple.com/");
    assertEquals(output.source.vintage, "2026-09-03");
});

Deno.test(`${ID} 409 ambiguous (recorded): free, hint surfaced`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Apple" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}who-ambiguous.json`),
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assert((output.message as string).startsWith("Use the exact legal_name"));
    assertEquals(output.raw.candidates.length, 2);
});

Deno.test(`${ID} 404 miss (recorded): free`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "zzqxnotacompanyxx.example" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}who-miss.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "not_found_in_source",
    );
});

Deno.test(`${ID} 402 (recorded): zero-billed, named as x402`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "apple.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}who-payment-required.json`),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assert((output.message as string).startsWith("payment_required"));
    assertEquals(output.raw.accepts[0].amount, "50000");
});

Deno.test(`${ID} schema gate: q required, bounded, strict`, async () => {
    const unit = await testSealedUnit(ID);
    const rejected: Record<string, string>[] = [
        {},
        { q: "" },
        { q: "x".repeat(201) },
        { name: "Apple" },
    ];
    for (const queryParams of rejected) {
        // no fixture: any upstream call would fail loudly
        await assertRejects(
            () => runEndpoint({ unit, input: { queryParams }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: `${ID} live (opt-in ALIENPROBE_LIVE=1; free 404 only)`,
    ignore: liveOff,
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { q: "zzqxnotacompanyxx.example" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result.output));
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
