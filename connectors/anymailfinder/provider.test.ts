import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Anymail Finder's draw per endpoint (anymailfinder.com/pricing and the
 * per-endpoint API docs, 2026-10-02; vendor-verified live 2026-10-01): 1
 * credit per verified person found, 2 per decision maker, 1 per company
 * list carrying verified addresses, 0.2 per verification. Every happy
 * chain's vendor claim (`credits_charged`) equals the fold, so no
 * `mismatch` key appears. Written as LITERALS on purpose (clay D7a). A new
 * endpoint must state its row here.
 */
const RATE: Record<
    string,
    { input: RunInput; usage: Record<string, unknown> }
> = {
    "anymailfinder#find-email/person": {
        input: { body: { domain: "example.com", full_name: "Jane Doe" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "anymailfinder#find-email/decision-maker": {
        input: {
            body: { domain: "example.com", decision_maker_category: ["ceo"] },
        },
        usage: { credits: { default: 2 }, evidence: { RESULT: 1 } },
    },
    "anymailfinder#find-email/company": {
        input: { body: { domain: "example.com" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "anymailfinder#verify-email": {
        input: { body: { email: "jane.doe@example.com" } },
        usage: { credits: { default: 0.2 }, evidence: { CALL: 1 } },
    },
};

/** Fixture dir: `endpoints/<id path, slashes as dashes>/fixtures/`. */
const happyFixture = (id: string) =>
    loadFixture(
        `${HERE}endpoints/${
            id.split("#")[1].replaceAll("/", "-")
        }/fixtures/synthetic-happy.json`,
    );

const ids = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("anymailfinder#"))
        .sort();
};

Deno.test("anymailfinder: the literal rate table covers exactly the compiled endpoints", async () => {
    const compiled = await ids();
    assertEquals(compiled.length, 4);
    assertEquals(compiled, Object.keys(RATE).sort());
});

Deno.test("anymailfinder: every endpoint's happy run settles its published draw", async () => {
    for (const [id, { input, usage }] of Object.entries(RATE)) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: await happyFixture(id),
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
    }
});

Deno.test("anymailfinder: fn provenance - one inject, one fromError, one consolidate shared by every endpoint", async () => {
    const bundle = await testBundle();
    const all = await ids();
    const ref = bundle.endpoints["anymailfinder#verify-email"];
    for (const id of all) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, ref.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            ref.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            ref.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(
            doc.request.url.startsWith("https://api.anymailfinder.com/v5.1/"),
            true,
            id,
        );
        assertEquals(doc.request.method, "POST", id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.lifecycle, undefined, id);
    }
    // the two finds that bill on `email_status` share one evidence fn
    assertEquals(
        bundle.endpoints["anymailfinder#find-email/person"].usage.evidence
            .$fn.key,
        bundle.endpoints["anymailfinder#find-email/decision-maker"].usage
            .evidence.$fn.key,
    );
});
