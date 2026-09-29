import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "alienprobe#company";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const LEI = "HWUPKR0MPOU8FGXBT394";

/** Live tests are gated on an explicit opt-in, not on a credential: this
 *  provider has none (x402). They only ever issue FREE refusals. */
const liveOff = Deno.env.get("ALIENPROBE_LIVE") !== "1";

// company-ok.json is NOT a recorder capture: it is the seller's own
// extensions.bazaar.info.output.example from the live 402 PAYMENT-REQUIRED
// header, stated byte-identical to the real paid record for this subject
// (paid call settled on Base 2026-09-29T03:10:21Z, tx 0x7885ab19…97f8).
// Trimmed by the repo's trimCalls (coverage string, `sources` array).
Deno.test(`${ID} happy (seller-declared 402 example, paid on-chain): flat $0.04, per-field provenance passes through`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: LEI } },
        mode: "replay",
        fixture: await loadFixture(`${chains}company-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.04 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, any>;
    assertEquals(output.schema_version, "company-lookup.v1");
    assertEquals(output.subject, { type: "company", value: LEI });
    // every profile field is {value, source, as_of} or null
    assertEquals(output.answer.legal_name, {
        value: "Apple Inc.",
        source: "GLEIF",
        as_of: "2026-09-28",
    });
    assertEquals(output.answer.cik.value, "0000320193");
    assertEquals(output.answer.cik.source, "SEC");
    // snapshot provenance rides beside the answer
    assertEquals(output.source.vintage, "2026-09-28");
    assertEquals(
        output.source.snapshot_sha256,
        "2204da1e5319ac551e286850578f2f5080b23cb26cd50d6b4682d9b26262c91b",
    );
    assertEquals(typeof output.delivered_at, "string");
});

Deno.test(`${ID} 409 ambiguous (recorded): free, candidates + recovery surfaced`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Apple" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}company-ambiguous.json`),
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assert((output.message as string).startsWith("Several entities match"));
    assertEquals(output.raw.error, "ambiguous");
    assertEquals(output.raw.candidates.length, 2);
    assertEquals(output.raw.recovery.automatic_selection, false);
});

Deno.test(`${ID} 404 miss (recorded): free, snapshot named`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "zzqxnotacompanyxx.example" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}company-miss.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assertEquals(output.message, "not_found_in_source");
    assertEquals(output.raw.source.vintage, "2026-09-28");
});

Deno.test(`${ID} 400 malformed (recorded): free, reason surfaced`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "abc", kind: "cik" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}company-malformed.json`),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "cik_malformed",
    );
});

Deno.test(`${ID} 402 (recorded): no payer wired ⇒ challenge is data, zero-billed, named`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "apple.com" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}company-payment-required.json`),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assert((output.message as string).startsWith("payment_required"));
    // the body carries the x402 v1 terms; the v2 header is not recorded
    assertEquals(
        output.raw.accepts[0].payTo,
        "0x701fd2Fc3295Ff2E98d986BD2032A966f54555f7",
    );
    assertEquals(output.raw.accepts[0].amount, "40000");
});

Deno.test(`${ID} auth: no credential exists — empty shape, nothing injected`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.auth.credentials.properties, {});
    assertEquals(unit.doc.auth.credentials.required, undefined);
});

Deno.test(`${ID} schema gate: q required and bounded, kind enumerated, strict`, async () => {
    const unit = await testSealedUnit(ID);
    const rejected: Record<string, string>[] = [
        {},
        { q: "" },
        { q: "x".repeat(201) },
        { q: "apple.com", kind: "isin" },
        { q: "apple.com", knd: "domain" },
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
