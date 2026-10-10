import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

Deno.test("fundmomentum: 4 endpoints share one auth fn, one lifecycle.start, one credit pool", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("fundmomentum#")
    ).sort();
    assertEquals(ids, [
        "fundmomentum#mcp/check_lp_coverage",
        "fundmomentum#mcp/get_changes",
        "fundmomentum#mcp/get_fund",
        "fundmomentum#mcp/search_funds",
    ]);

    const docs = ids.map((id) => bundle.endpoints[id]);
    for (const doc of docs) {
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.request.url, "https://fundmomentum.vc/_api/mcp");
        assertEquals(
            doc.auth.inject.$fn.key,
            docs[0].auth.inject.$fn.key,
            doc.id,
        );
        assert(
            doc.lifecycle?.start !== undefined,
            `${doc.id} has lifecycle.start`,
        );
        assertEquals(
            doc.lifecycle.start.$fn.key,
            docs[0].lifecycle!.start!.$fn.key,
            doc.id,
        );
    }

    const kinds: Record<string, string> = {
        "fundmomentum#mcp/check_lp_coverage": "FREE",
        "fundmomentum#mcp/get_changes": "PER_CALL",
        "fundmomentum#mcp/get_fund": "PER_CALL",
        "fundmomentum#mcp/search_funds": "PER_CALL",
    };
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model.kind, kinds[id], id);
        if (kinds[id] === "PER_CALL") {
            assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        }
    }
});
