import { assert, assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { testBundle, testSealedUnit } from "@shared/testing";

Deno.test("theagentbar: exposes public discovery, four purchases, and authenticated recovery", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("theagentbar#")
    ).sort();
    assertEquals(ids, [
        "theagentbar#api/menu",
        "theagentbar#api/partners/monid/v1/drinks/context-window-collins",
        "theagentbar#api/partners/monid/v1/drinks/hallucination-highball",
        "theagentbar#api/partners/monid/v1/drinks/null-pointer-nightcap",
        "theagentbar#api/partners/monid/v1/drinks/recursive-negroni",
        "theagentbar#api/partners/monid/v1/orders/{nonce}",
        "theagentbar#api/receipts/{code}",
    ]);
    for (const id of ids.filter((id) => !id.includes("/partners/"))) {
        const unit = await testSealedUnit(id);
        assertEquals(unit.doc.request.method, "GET");
        assertEquals(unit.doc.auth.credentials.required ?? [], []);
        assertEquals(unit.doc.auth.credentials.properties, {});
    }
});

Deno.test("theagentbar: runs with empty credentials and never forwards unused secrets", async () => {
    const unit = await testSealedUnit("theagentbar#api/menu");
    const credentials: Record<string, string>[] = [{}, {
        apiKey: "unused-test-placeholder",
    }];
    for (const params of credentials) {
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve(params),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(String(url), "https://theagent.bar/api/menu");
                    assertEquals(init?.method, "GET");
                    assertEquals(
                        Object.fromEntries(new Headers(init?.headers)),
                        {},
                    );
                    assertEquals(init?.body, undefined);
                    return Promise.resolve(Response.json({ menu: [] }));
                },
            }),
        });
        const loaded = await engine.load(unit);
        const result = await loaded.run({});
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(calls, 1);
    }
});

Deno.test("theagentbar: four purchases share lifecycle and meter; free reads do not inherit either", async () => {
    const bundle = await testBundle();
    const docs = Object.values(bundle.endpoints).filter((doc) =>
        doc.id.startsWith("theagentbar#")
    );
    const paid = docs.filter((doc) => doc.id.includes("/drinks/"));
    const reads = docs.filter((doc) => !doc.id.includes("/drinks/"));
    assertEquals(paid.length, 4);
    assertEquals(reads.length, 3);
    const first = paid[0];
    assert(first.lifecycle?.start);
    assert(first.usage.consolidate);
    for (const doc of paid) {
        assertEquals(
            doc.lifecycle?.start?.$fn.key,
            first.lifecycle.start.$fn.key,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate.$fn.key,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
        assertEquals(doc.usage.estimate.$fn.key, doc.usage.evidence.$fn.key);
        assertEquals(
            bundle.fnTable[doc.usage.estimate.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
        );
    }
    for (const doc of reads) {
        assertEquals(doc.lifecycle?.start, undefined);
        assertEquals(doc.usage.consolidate, undefined);
        assertEquals(doc.usage.model.kind, "FREE");
        assertEquals(doc.usage.estimate.$fn.key, first.usage.estimate.$fn.key);
    }
    const publicReads = reads.filter((doc) => !doc.id.includes("/partners/"));
    assertEquals(
        publicReads[0].auth.inject.$fn.key,
        publicReads[1].auth.inject.$fn.key,
    );
    assert(publicReads[0].auth.inject.$fn.key !== first.auth.inject.$fn.key);
    const recovery = reads.find((doc) => doc.id.includes("/partners/"))!;
    assertEquals(recovery.auth.inject.$fn.key, first.auth.inject.$fn.key);
});
