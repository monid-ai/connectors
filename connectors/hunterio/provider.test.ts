import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * Hunter's draw per endpoint — v1's 2026-08-20 ledger drill (three-way
 * reconciliation against the account balance) and the live reference's
 * own statements (hunter.io/api-documentation/v2, 2026-09-17): 1 credit
 * per started block of ten domain-search addresses, 1 per address found,
 * 0.5 per definitive verdict, the reveal's own `meta.credits_charged`,
 * 0.2 per enrichment profile carrying every core data point
 * (help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17), the
 * 8.36-credit gate on the AI search (owner
 * decision, design D6), and zero for the five free lookups. Only the
 * reveal carries a meter; on its happy chain the claim equals the fold,
 * so no `mismatch` key appears anywhere (zUsage is strict; deep-equality
 * proves it). Written as LITERALS on purpose (clay D7a): deriving them
 * from each doc's own model would make this test a tautology. A new
 * endpoint must state its row here.
 */
const RATE: Record<
    string,
    { input: RunInput; usage: Record<string, unknown> }
> = {
    "hunterio#domain-search": {
        input: { body: { domain: "intercom.com", limit: 25 } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 12 } },
    },
    "hunterio#email-finder": {
        input: {
            queryParams: {
                domain: "example.com",
                first_name: "Jane",
                last_name: "Doe",
            },
        },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "hunterio#email-verifier": {
        input: { queryParams: { email: "john.doe@example.com" } },
        usage: { credits: { default: 0.5 }, evidence: { RESULT: 1 } },
    },
    "hunterio#email-count": {
        input: { queryParams: { domain: "stripe.com" } },
        usage: { credits: {}, evidence: {} },
    },
    "hunterio#domain-finder": {
        input: { queryParams: { company: "stripe" } },
        usage: { credits: {}, evidence: {} },
    },
    "hunterio#discover": {
        input: { body: { organization: { domain: ["hunter.io"] } } },
        usage: { credits: {}, evidence: {} },
    },
    "hunterio#discover-ai": {
        input: {
            body: {
                query:
                    "Companies in Europe that specialize in software development",
            },
        },
        usage: { credits: { default: 8.36 }, evidence: { CALL: 1 } },
    },
    "hunterio#discover/people": {
        input: { body: { industry: { include: ["Financial Services"] } } },
        usage: { credits: {}, evidence: {} },
    },
    "hunterio#multi-domain-search": {
        input: { queryParams: { location: "US", department: "executive" } },
        usage: { credits: {}, evidence: {} },
    },
    "hunterio#multi-domain-search/reveal": {
        input: {
            body: {
                handles: [
                    "Qk1hQ2c9PS0tZW5jcnlwdGVkLW9wYXF1ZS1oYW5kbGU",
                    "QWJjMTIzLS1hbHJlYWR5LXJldmVhbGVkLWhhbmRsZQ",
                ],
            },
        },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "hunterio#people/find": {
        input: { queryParams: { email: "jane.doe@example.com" } },
        usage: { credits: { default: 0.2 }, evidence: { RESULT: 1 } },
    },
    "hunterio#companies/find": {
        input: { queryParams: { domain: "hunter.io" } },
        usage: { credits: { default: 0.2 }, evidence: { RESULT: 1 } },
    },
    "hunterio#combined/find": {
        input: { queryParams: { email: "jane.doe@example.com" } },
        usage: { credits: { default: 0.2 }, evidence: { RESULT: 1 } },
    },
};

/** Fixture dir: `endpoints/<id, slashes as dashes>/fixtures/`. */
const happyFixture = (id: string) =>
    loadFixture(
        `${HERE}endpoints/${
            id.split("#")[1].replaceAll("/", "-")
        }/fixtures/synthetic-happy.json`,
    );

const hunterioIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("hunterio#"))
        .sort();
};

Deno.test("hunterio: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await hunterioIds();
    assertEquals(ids.length, 13);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("hunterio: every endpoint's happy run settles its published draw", async () => {
    for (const [id, { input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const fixture = await happyFixture(id);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
    }
});

Deno.test("hunterio: the reveal's meter is stripped; nothing else is touched", async () => {
    const id = "hunterio#multi-domain-search/reveal";
    const unit = await testSealedUnit(id);
    const fixture = await happyFixture(id);
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    const meta = (result.output as { meta: Record<string, Json> }).meta;
    assertEquals("credits_charged" in meta, false);
    assertEquals(Array.isArray(meta.handles), true);
    // an untouched doc: the whole body relays
    const count = "hunterio#email-count";
    const countFixture = await happyFixture(count);
    const countResult = await runEndpoint({
        unit: await testSealedUnit(count),
        input: RATE[count].input,
        mode: "replay",
        fixture: countFixture,
    });
    assertEquals(countResult.output, countFixture.calls[0].res.body);
});

Deno.test("hunterio: usage fn provenance — one inject, one fromError, the reveal's own claim, the verifier's own lifecycle", async () => {
    const bundle = await testBundle();
    const ids = await hunterioIds();
    const count = bundle.endpoints["hunterio#email-count"];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, count.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            count.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.request.url.startsWith("https://api.hunter.io/v2/"),
            true,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
    }
    // the reveal is the ONE doc with a consolidate (its meter)
    assertEquals(
        ids.filter((id) =>
            bundle.endpoints[id].usage.consolidate !== undefined
        ),
        ["hunterio#multi-domain-search/reveal"],
    );
    // the verifier is the ONE doc with a lifecycle (Hunter's 202 / 222)
    assertEquals(
        ids.filter((id) => bundle.endpoints[id].lifecycle !== undefined),
        ["hunterio#email-verifier"],
    );
    assertEquals(bundle.endpoints["hunterio#email-verifier"].timeouts, {
        requestMs: 30_000,
        runMs: 180_000,
        pollMs: 10_000,
    });
    // the seven metered docs state their own evidence; the rest inherit
    // the provider's (design D3)
    const own = ids.filter((id) =>
        bundle.endpoints[id].usage.evidence.$fn.key !==
            count.usage.evidence.$fn.key
    );
    assertEquals(own, [
        "hunterio#combined/find",
        "hunterio#companies/find",
        "hunterio#domain-search",
        "hunterio#email-finder",
        "hunterio#email-verifier",
        "hunterio#multi-domain-search/reveal",
        "hunterio#people/find",
    ]);
    // one wire path, two ids
    assertEquals(
        bundle.endpoints["hunterio#discover-ai"].request.url,
        bundle.endpoints["hunterio#discover"].request.url,
    );
});
