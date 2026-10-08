import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * JobsPipe's rate card, stated as LITERALS (clay D7a — deriving them from
 * the docs would make this a tautology): one credit per job returned on
 * the two searches (the filter search adds a second one-credit line per
 * posting naming a technology behind `include_technologies`), one flat
 * credit per call on the lookup, and one on a scan that detected anything.
 * Every doc drains the ONE pool (`default`, JobsPipe credits), sends the
 * key as a bearer token, and inherits the provider's consolidate (the
 * search responses carry `metadata.credits_charged`; the flat docs
 * carry no meter, so their claim is empty and the fold settles).
 */
Deno.test("jobspipe: four docs, one pool, bearer auth, shared settle fns", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("jobspipe#")
    ).sort();
    assertEquals(ids, [
        "jobspipe#v1/companies/{key}",
        "jobspipe#v1/jobs/agentic-search",
        "jobspipe#v1/jobs/search",
        "jobspipe#v1/stack/scan",
    ]);
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // one bearer inject, one consolidate, one evidence — interned
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        // the stack scan owns its evidence (it counts `detected`, and
        // bills only when that is non-empty) and so does the filter
        // search (two components); the rest share the provider's
        // billable-`data[]` counter
        if (
            id !== "jobspipe#v1/stack/scan" && id !== "jobspipe#v1/jobs/search"
        ) {
            assertEquals(
                doc.usage.evidence.$fn.key,
                first.usage.evidence.$fn.key,
                id,
            );
        }
        assertEquals(typeof doc.usage.consolidate?.$fn.key, "string", id);
        // ONE pool, drained by every doc
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        const model = doc.usage.model;
        const pools = model.kind === "COMPOSITE"
            ? Object.values(model.components).map((c) =>
                "consumes" in c ? c.consumes.credit : undefined
            )
            : ["consumes" in model ? model.consumes.credit : undefined];
        assertEquals(pools, pools.map(() => "default"), id);
        // the validated input IS the wire body — no toRequest anywhere
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(typeof doc.output.fromError?.$fn.key, "string", id);
    }
    // the wire form
    assertEquals(
        bundle.endpoints["jobspipe#v1/jobs/search"].request,
        { method: "POST", url: "https://api.jobspipe.dev/v1/jobs/search" },
    );
    assertEquals(
        bundle.endpoints["jobspipe#v1/companies/{key}"].request,
        {
            method: "GET",
            url: "https://api.jobspipe.dev/v1/companies/{key}",
        },
    );
    // the card: the filter search is two per-result lines (postings +
    // technology lines), the agentic search one, flat lookup, scan
    // metered 0/1 on whether it detected anything
    const kinds = Object.fromEntries(
        ids.map((id) => [id, bundle.endpoints[id].usage.model.kind]),
    );
    assertEquals(kinds, {
        "jobspipe#v1/companies/{key}": "PER_CALL",
        "jobspipe#v1/jobs/agentic-search": "PER_UNIT",
        "jobspipe#v1/jobs/search": "COMPOSITE",
        "jobspipe#v1/stack/scan": "PER_UNIT",
    });
});
