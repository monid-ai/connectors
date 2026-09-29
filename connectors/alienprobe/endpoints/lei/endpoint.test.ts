import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "alienprobe#lei";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const LEI = "HWUPKR0MPOU8FGXBT394";

// synthetic-lei-ok.json: no paid recording exists, so by the repo's rule it
// is `synthetic-`; its bytes are the seller's own bazaar output example,
// copied verbatim from the live 402 PAYMENT-REQUIRED header — not invented.
Deno.test(`${ID} happy (synthetic: seller-declared 402 example): flat $0.005`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { lei: LEI } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-lei-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, any>;
    assertEquals(output.schema_version, "lei-lookup.v2");
    assertEquals(output.answer.legal_name, "Apple Inc.");
    assertEquals(output.answer.entity_status, "ACTIVE");
    assertEquals(output.answer.registration_status, "ISSUED");
});

Deno.test(`${ID} 402 (recorded): zero-billed, named as x402`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { lei: LEI } },
        mode: "replay",
        fixture: await loadFixture(`${chains}lei-payment-required.json`),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, any>;
    assert((output.message as string).startsWith("payment_required"));
    assertEquals(output.raw.accepts[0].amount, "5000");
});

Deno.test(`${ID} 400 bad check digit (recorded): free, passes our pattern, refused upstream`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { lei: "HWUPKR0MPOU8FGXBT395" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}lei-malformed.json`),
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "invalid_subject",
    );
});

Deno.test(`${ID} 404 miss (recorded): free`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { lei: "ZZZZ00QXNOTALEIXX007" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}lei-miss.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "not_found_in_source",
    );
});

Deno.test(`${ID} schema gate: a non-LEI never reaches the wire`, async () => {
    const unit = await testSealedUnit(ID);
    for (const lei of ["abc", LEI.toLowerCase(), LEI + "0"]) {
        // no fixture: any upstream call would fail loudly
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: { lei } },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

/** Opt-in live gate — this provider has no credential (x402). */
Deno.test({
    name: `${ID} live (opt-in ALIENPROBE_LIVE=1; free 404 only)`,
    ignore: Deno.env.get("ALIENPROBE_LIVE") !== "1",
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { lei: "ZZZZ00QXNOTALEIXX007" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result.output));
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
