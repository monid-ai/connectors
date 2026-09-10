import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("exa#contents happy: vendor claim agrees with the per-result fold — no mismatch", async () => {
    const unit = await testSealedUnit("exa#contents");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                urls: ["https://example.com/solid-state-2026"],
                text: true,
            },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    // D27 claim-wins: the fixture's costDollars.total ($0.001) is the
    // vendor's claim and IS usage.credits; the pinned fold (1 delivered
    // result × $0.001/page = 0.001) agrees within 1e-9, so no mismatch
    // key settles (zUsage is strict — deep equality proves its absence)
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { RESULT: 1 },
    });
    // usage.consolidate absorbed the vendor billing field out of the
    // payload (it stays in the RAW run record)
    assert(!("costDollars" in (result.output as Record<string, unknown>)));
});

Deno.test("exa#contents provider error: zero usage", async () => {
    const unit = await testSealedUnit("exa#contents");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { urls: ["https://example.com/x"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("interning: auth + consolidate provider-shared; evidence fns diverged", async () => {
    const bundle = await testBundle();
    const search = bundle.endpoints["exa#search"];
    const contents = bundle.endpoints["exa#contents"];
    // each doc owns its QUANTITIES fn (offset counting vs per-result) —
    // two content-addressed entries (design D19/D27)
    assert(
        search.usage.evidence.$fn.key !== contents.usage.evidence.$fn.key,
    );
    // the VENDOR-METER fn is provider-level (where costDollars lives is
    // a provider-wide fact) — ONE consolidate entry shared by both
    assertEquals(
        search.usage.consolidate?.$fn.key,
        contents.usage.consolidate?.$fn.key,
    );
    // both still share the provider auth fn (content addressing at work)
    assertEquals(search.auth.inject.$fn.key, contents.auth.inject.$fn.key);
});

Deno.test({
    name: "exa#contents live (gated on EXA_API_KEY)",
    ignore: liveSkip("exa"),
    fn: async () => {
        const unit = await testSealedUnit("exa#contents");
        const result = await runEndpoint({
            unit,
            input: { body: { urls: ["https://exa.ai"], text: true } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
