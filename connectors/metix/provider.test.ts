import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

Deno.test("metix: seven sync docs, one pool, block rates 25 and 5, one composite", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("metix#")
    ).sort();
    assertEquals(ids, [
        "metix#entity/v1/companies/detail-by-id",
        "metix#entity/v1/jobs/detail-by-id",
        "metix#entity/v1/profiles/detail-by-id",
        "metix#v1/companies/query",
        "metix#v1/jobs/query",
        "metix#v1/people-search",
        "metix#v1/people/query",
    ]);

    // Every doc: POST, one credit pool, no vendor meter to read, no error
    // or output rewriting, and no async lifecycle.
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "POST", id);
        assert(
            doc.request.url.startsWith("https://mira-api.metix.ai/"),
            `${id} absolute url`,
        );
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.output?.fromError, undefined, id);
        assertEquals(doc.output?.fromResponse, undefined, id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.lifecycle, undefined, id);
    }

    // One auth fn across the provider, interned once.
    const authKeys = new Set(
        ids.map((id) => bundle.endpoints[id].auth.inject.$fn.key),
    );
    assertEquals(authKeys.size, 1);

    // The three searches and the three reads are each one interned
    // estimate fn per FAMILY? No: each reads a differently-named field, so
    // the searches share one source (body.size) and the reads differ by the
    // id array's name. What must hold is that the two size-reading
    // searches over `size` intern together.
    const queryEstimates = new Set([
        "metix#v1/people/query",
        "metix#v1/jobs/query",
        "metix#v1/companies/query",
    ].map((id) => bundle.endpoints[id].usage.estimate.$fn.key));
    assertEquals(queryEstimates.size, 1, "the three query estimates intern");

    // Block rates are the vendor's published ones: 25 IDs per credit on a
    // search, 5 records per credit on a read.
    const blocks: Record<string, number> = {
        "metix#v1/people/query": 25,
        "metix#v1/jobs/query": 25,
        "metix#v1/companies/query": 25,
        "metix#entity/v1/profiles/detail-by-id": 5,
        "metix#entity/v1/jobs/detail-by-id": 5,
        "metix#entity/v1/companies/detail-by-id": 5,
    };
    for (const [id, every] of Object.entries(blocks)) {
        const model = bundle.endpoints[id].usage.model;
        assertEquals(model.kind, "PER_UNIT", id);
        assertEquals("every" in model ? model.every : undefined, every, id);
        assertEquals("unit" in model ? model.unit : undefined, "RESULT", id);
        assertEquals(
            "consumes" in model ? model.consumes : undefined,
            { credit: "default", amount: 1 },
            id,
        );
    }

    // The natural-language search is the one composite: a flat base of 5
    // AND the same per-25 line.
    const search = bundle.endpoints["metix#v1/people-search"].usage.model;
    assertEquals(search.kind, "COMPOSITE");
    const components = "components" in search ? search.components : {};
    assertEquals(Object.keys(components).sort(), [
        "ai_search_base",
        "profile_ids",
    ]);
    assertEquals(components.ai_search_base, {
        kind: "PER_CALL",
        label: "AI search base",
        description: "drawn on every successful response, " +
            "including one that returns no IDs",
        consumes: { credit: "default", amount: 5 },
    });
    const metered = components.profile_ids;
    assertEquals(metered.kind, "PER_UNIT");
    assertEquals("every" in metered ? metered.every : undefined, 25);
    assertEquals(metered.consumes, { credit: "default", amount: 1 });

    // Categories: only leaves that already exist in the registry.
    for (const id of ids) {
        const leaves = bundle.endpoints[id].meta.categories ?? [];
        assert(leaves.length > 0, `${id} declares a category`);
        for (const leaf of leaves) {
            assert(
                ["people-enrichment", "company-enrichment", "jobs"].includes(
                    leaf,
                ),
                `${id} leaf ${leaf}`,
            );
        }
    }
});
