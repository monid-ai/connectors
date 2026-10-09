import { assert, assertEquals } from "@std/assert";
import { checkDelivery, sign } from "./webhook.ts";

/**
 * The verify-descriptor executor's unit pins — the crypto half of the
 * local webhook loop, previously proven only by simulate's self
 * round-trip (which masked the saperly `v1=` envelope bug: signing and
 * verifying shared the same bare-hex assumption, so the loop stayed
 * green while every REAL delivery would have answered 401).
 *
 * The prefix semantics under pin are v1's
 * (adaptors/saperly/webhooks.ts): a declared prefix is REQUIRED on the
 * header (`startsWith` + strip ≡ prefix-concat compare), and an
 * undeclared prefix rejects a prefixed header.
 */

const SECRET = "test-secret";

const BASE = {
    scheme: "hmac-sha256" as const,
    signatureHeader: "x-demo-signature",
    timestampHeader: "x-demo-timestamp",
    payload: "${timestamp}.${rawBody}",
    toleranceMs: 300_000,
};

const PREFIXED = { ...BASE, signaturePrefix: "v1=" };

const RAW = JSON.stringify({ eventType: "demo.event", payload: { id: "1" } });

Deno.test("webhook verify: round-trip WITH a declared prefix verifies", async () => {
    const at = new Date("2026-09-17T12:00:00Z");
    const headers = await sign(PREFIXED, SECRET, RAW, at);
    assert(headers["x-demo-signature"].startsWith("v1="));
    const check = await checkDelivery(PREFIXED, SECRET, headers, RAW, at);
    assertEquals(check, { ok: true });
});

Deno.test("webhook verify: a bare-hex header against a declared prefix is a mismatch", async () => {
    const at = new Date("2026-09-17T12:00:00Z");
    const headers = await sign(BASE, SECRET, RAW, at);
    const check = await checkDelivery(PREFIXED, SECRET, headers, RAW, at);
    assertEquals(check, { ok: false, reason: "signature mismatch" });
});

Deno.test("webhook verify: a prefixed header against an undeclared prefix is a mismatch", async () => {
    const at = new Date("2026-09-17T12:00:00Z");
    const headers = await sign(PREFIXED, SECRET, RAW, at);
    const check = await checkDelivery(BASE, SECRET, headers, RAW, at);
    assertEquals(check, { ok: false, reason: "signature mismatch" });
});

Deno.test("webhook verify: signature checked FIRST — a stale delivery with a BAD signature reads as mismatch", async () => {
    // v1's ordering invariant: timing/reason must not distinguish a
    // stale-but-valid signature from a fresh-but-invalid one by
    // answering the tolerance question before the crypto question.
    const signedAt = new Date("2026-09-17T12:00:00Z");
    const checkedAt = new Date("2026-09-17T13:00:00Z"); // way past ±300s
    const headers = await sign(PREFIXED, "WRONG-secret", RAW, signedAt);
    const check = await checkDelivery(
        PREFIXED,
        SECRET,
        headers,
        RAW,
        checkedAt,
    );
    assertEquals(check, { ok: false, reason: "signature mismatch" });
});

Deno.test("webhook verify: a stale delivery with a GOOD signature fails the window", async () => {
    const signedAt = new Date("2026-09-17T12:00:00Z");
    const checkedAt = new Date("2026-09-17T13:00:00Z");
    const headers = await sign(PREFIXED, SECRET, RAW, signedAt);
    const check = await checkDelivery(
        PREFIXED,
        SECRET,
        headers,
        RAW,
        checkedAt,
    );
    assertEquals(check, {
        ok: false,
        reason: "timestamp outside ±300000ms window",
    });
});

Deno.test("webhook verify: tampered raw bytes are a mismatch", async () => {
    const at = new Date("2026-09-17T12:00:00Z");
    const headers = await sign(PREFIXED, SECRET, RAW, at);
    const check = await checkDelivery(
        PREFIXED,
        SECRET,
        headers,
        RAW + " ", // one byte off — raw-byte fidelity is the whole point
        at,
    );
    assertEquals(check, { ok: false, reason: "signature mismatch" });
});
