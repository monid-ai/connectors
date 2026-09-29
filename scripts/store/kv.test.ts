import { assert, assertEquals } from "@std/assert";
import { z } from "zod";
import type { ConnectorSource, OwnedResource } from "@shared/core";
import {
    defineEndpoint,
    defineProvider,
    defineResource,
    presets,
    sealUnit,
} from "@shared/core";
import { compileBundle } from "@shared/compiler";
import {
    directTransport,
    Engine,
    ENGINE_VERSION,
    type Transport,
} from "@monid/connector-engine";
import {
    KvResourceStore,
    persistEffects,
    resolveLookupKeys,
    type ResourceDefLookup,
} from "./kv.ts";

/**
 * The LOCAL store's identity layer (design D48): a resource is findable
 * by every handle its def declares, and by nothing else.
 *
 * These are the tests the feature exists for. Before it, a phone number
 * answered only to a uuid — so a `call.received` webhook (which carries
 * the E.164 and no uuid) could not name its own resource, and a person
 * holding the number they were just sold got a 404. Each case below is
 * one half of that: the handle resolves, or an unknown handle stays
 * unknown.
 */

const RESOURCE = "demo/phone-number";

/** The def facts a compiled bundle would supply. */
const DEFS: ResourceDefLookup = (id) =>
    id === RESOURCE
        ? { type: "phone_number", keys: { e164: "$.phoneNumber" } }
        : undefined;

/** Each test gets its own KV file: Deno KV is a real database, and a
 *  shared one would make these order-dependent. */
async function withStore(
    fn: (store: KvResourceStore) => Promise<void>,
    // "none" rather than undefined: an explicit undefined would fall
    // back to the default parameter, which is the opposite of the case
    // being tested
    defs: ResourceDefLookup | "none" = DEFS,
): Promise<void> {
    const dir = await Deno.makeTempDir({ prefix: "monid-kv-test-" });
    const store = await KvResourceStore.open({
        path: `${dir}/local.db`,
        defs: defs === "none" ? undefined : defs,
    });
    try {
        await fn(store);
    } finally {
        store.close();
        await Deno.remove(dir, { recursive: true });
    }
}

function row(overrides: Partial<OwnedResource> = {}): OwnedResource {
    return {
        resource: RESOURCE,
        externalId: "num_1",
        identifier: "+14155550123",
        data: { phoneNumber: "+14155550123", country: "US" },
        ...overrides,
    };
}

Deno.test("resolveLookupKeys: reads declared paths, skips what is absent", () => {
    assertEquals(
        resolveLookupKeys({ e164: "$.phoneNumber" }, {
            phoneNumber: "+14155550123",
        }),
        { e164: "+14155550123" },
    );
    // a DEGRADED provision (the vendor answered without the number) is
    // addressable by externalId alone rather than indexed under ""
    assertEquals(resolveLookupKeys({ e164: "$.phoneNumber" }, {}), {});
    // a non-string value is not a handle
    assertEquals(
        resolveLookupKeys({ e164: "$.phoneNumber" }, { phoneNumber: 1415 }),
        {},
    );
});

Deno.test("provision stamps type + identifier + resolved keys from the def", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        const stored = await store.get(RESOURCE, "num_1");
        assertEquals(stored?.type, "phone_number");
        assertEquals(stored?.identifier, "+14155550123");
        assertEquals(stored?.keys, { e164: "+14155550123" });
    });
});

Deno.test("identifier falls back to externalId, never to nothing", async () => {
    await withStore(async (store) => {
        await store.provision(row({ identifier: undefined }));
        const stored = await store.get(RESOURCE, "num_1");
        assertEquals(stored?.identifier, "num_1");
    });
});

Deno.test("a resource answers to its externalId AND every declared key", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        const byId = await store.get(RESOURCE, "num_1");
        const byKey = await store.get(RESOURCE, "+14155550123");
        assertEquals(byId?.externalId, "num_1");
        // the SAME canonical row: a caller never learns which handle it
        // used, which is what lets the webhook path and the user path
        // share one implementation
        assertEquals(byKey?.externalId, "num_1");
        assertEquals(byKey, byId);
    });
});

Deno.test("owned() resolves a lookup key — the ownership gate's path", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        const hit = await store.owned({
            resource: RESOURCE,
            externalId: "+14155550123",
        });
        assertEquals(hit.length, 1);
        assertEquals(hit[0].externalId, "num_1");
        // and an unknown handle still owns NOTHING — the gate must fail
        // closed, or an index becomes a way to reach other people's rows
        const miss = await store.owned({
            resource: RESOURCE,
            externalId: "+19999999999",
        });
        assertEquals(miss, []);
    });
});

Deno.test("release takes the index down with the row", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        await store.release(RESOURCE, "num_1");
        assertEquals(await store.get(RESOURCE, "num_1"), undefined);
        // the pointer must not outlive what it names, or a released
        // number keeps resolving to a row that is gone
        assertEquals(await store.get(RESOURCE, "+14155550123"), undefined);
        const tombstones = await store.released();
        assertEquals(tombstones.length, 1);
        assertEquals(tombstones[0].externalId, "num_1");
    });
});

Deno.test("release accepts a lookup key as the handle", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        // the engine's release MARK carries whatever the user typed, so
        // the store must resolve it or a release by E.164 would delete
        // nothing and silently succeed
        await store.release(RESOURCE, "+14155550123");
        assertEquals(await store.get(RESOURCE, "num_1"), undefined);
    });
});

Deno.test("refresh re-derives the index from the new data", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        await store.refresh(RESOURCE, "num_1", {
            phoneNumber: "+14155559999",
            country: "US",
        });
        const stored = await store.get(RESOURCE, "num_1");
        assertEquals(stored?.keys, { e164: "+14155559999" });
        assert(stored?.syncedAt !== undefined);
        // the SUPERSEDED value must stop resolving: a stale pointer is
        // worse than no pointer, because it answers confidently
        assertEquals(await store.get(RESOURCE, "+14155550123"), undefined);
        assertEquals(
            (await store.get(RESOURCE, "+14155559999"))?.externalId,
            "num_1",
        );
    });
});

Deno.test("refresh that clears the source field clears the key", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        await store.refresh(RESOURCE, "num_1", { country: "US" });
        const stored = await store.get(RESOURCE, "num_1");
        assertEquals(stored?.keys, undefined);
        assertEquals(await store.get(RESOURCE, "+14155550123"), undefined);
    });
});

Deno.test("a key value cannot be repointed at a second resource", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        // two live numbers cannot share an E.164, so this is bad data,
        // not a race. Silently repointing would leave the index
        // answering confidently with the wrong row.
        const clash = row({
            externalId: "num_2",
            data: { phoneNumber: "+14155550123", country: "US" },
        });
        let threw = "";
        try {
            await store.provision(clash);
        } catch (error) {
            threw = String(error);
        }
        assert(threw.includes("already resolves to"), threw);
        assertEquals(
            (await store.get(RESOURCE, "+14155550123"))?.externalId,
            "num_1",
        );
    });
});

Deno.test("re-provisioning the SAME resource reclaims its own keys", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        // a resurrect (the atomic provision drops the tombstone) must
        // not trip the conflict guard on keys it already owns
        await store.provision(row({ identifier: "+14155550123 (again)" }));
        assertEquals(
            (await store.get(RESOURCE, "+14155550123"))?.externalId,
            "num_1",
        );
    });
});

Deno.test("reindex drops keys the def no longer declares", async () => {
    const dir = await Deno.makeTempDir({ prefix: "monid-kv-test-" });
    const path = `${dir}/local.db`;
    try {
        const before = await KvResourceStore.open({ path, defs: DEFS });
        await before.provision(row());
        before.close();

        // the def RETIRES the key — dropping the entry must stop the
        // old value resolving, or a retired key outlives its
        // declaration
        const after = await KvResourceStore.open({
            path,
            defs: () => ({ type: "phone_number", keys: {} }),
        });
        await after.reindex();
        assertEquals(await after.get(RESOURCE, "+14155550123"), undefined);
        assertEquals((await after.get(RESOURCE, "num_1"))?.keys, undefined);
        after.close();
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});

Deno.test("owned() without a handle lists every row of that resource", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        await store.provision(row({
            externalId: "num_2",
            identifier: "+14155559999",
            data: { phoneNumber: "+14155559999", country: "US" },
        }));
        const all = await store.owned({ resource: RESOURCE });
        assertEquals(all.length, 2);
        // a different resource kind shares the store but not the window
        assertEquals(await store.owned({ resource: "demo/other" }), []);
    });
});

Deno.test("reindex repairs rows written before the def declared a key", async () => {
    const dir = await Deno.makeTempDir({ prefix: "monid-kv-test-" });
    const path = `${dir}/local.db`;
    try {
        // FIRST: a store with no def knowledge — exactly a row persisted
        // before `keys` existed
        const before = await KvResourceStore.open({ path });
        await before.provision(row({ identifier: undefined }));
        assertEquals(
            await before.get(RESOURCE, "+14155550123"),
            undefined,
        );
        before.close();

        // THEN: the def grows a key. Re-provisioning is not an option —
        // that would buy the resource a second time — so the index is
        // rebuilt from the data already stored.
        const after = await KvResourceStore.open({ path, defs: DEFS });
        const result = await after.reindex();
        assertEquals(result, { rows: 1, keys: 1 });
        assertEquals(
            (await after.get(RESOURCE, "+14155550123"))?.externalId,
            "num_1",
        );
        assertEquals(
            (await after.get(RESOURCE, "num_1"))?.type,
            "phone_number",
        );
        after.close();
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});

Deno.test("forget drops the row and its pointers, leaving NO tombstone", async () => {
    await withStore(async (store) => {
        await store.provision(row());
        assertEquals(await store.forget(RESOURCE, "+14155550123"), true);
        assertEquals(await store.get(RESOURCE, "num_1"), undefined);
        assertEquals(await store.get(RESOURCE, "+14155550123"), undefined);
        // forget is LOCAL amnesia, not a release: claiming a release
        // that never reached the vendor would be a lie in the audit
        assertEquals(await store.released(), []);
        assertEquals(await store.forget(RESOURCE, "num_1"), false);
    });
});

Deno.test("with no def lookup the store persists exactly what it was given", async () => {
    await withStore(async (store) => {
        await store.provision(row({ keys: { e164: "+14155550123" } }));
        const stored = await store.get(RESOURCE, "num_1");
        // a fixture window / test caller stays authoritative over its
        // own rows — the store never invents a type it was not told
        assertEquals(stored?.type, undefined);
        assertEquals(stored?.keys, { e164: "+14155550123" });
    }, "none");
});

// ---------------------------------------------------------------------------
// the gate, end to end: engine + real store
// ---------------------------------------------------------------------------

/** A one-endpoint connector whose `uses` binding keys off the body. */
function gateConnector(): ConnectorSource[] {
    return [{
        provider: defineProvider({
            name: "demo",
            meta: { displayName: "Demo", summary: "Gate demo." },
            auth: { inject: presets.auth.header("x-demo-key") },
            request: { baseUrl: "https://api.demo.test" },
            usage: { model: { kind: "FREE" } },
        }),
        resources: [{
            name: "phone-number",
            def: defineResource({
                slug: "phone-number",
                type: "phone_number",
                keys: { e164: "$.phoneNumber" },
                meta: { displayName: "Number", summary: "A demo number." },
                data: z.strictObject({ phoneNumber: z.string().optional() }),
                usage: {
                    period: {
                        unit: "MONTH",
                        count: 1,
                        anchor: "CREATION_TIME",
                    },
                    lines: {
                        rent: { consumes: { credit: "default", amount: 1 } },
                    },
                },
                lifecycle: {
                    verify: () => Promise.resolve({ active: true }),
                    release: () => Promise.resolve({ released: true }),
                },
            }),
        }],
        endpoints: [{
            name: "call",
            def: defineEndpoint({
                meta: {
                    displayName: "Call",
                    summary: "Call from a number you own.",
                    categories: ["demo-search"],
                },
                endpoint: "/call",
                request: { method: "POST", path: "/call" },
                input: {
                    schema: { body: z.object({ from: z.string() }).strict() },
                },
                resources: {
                    uses: [{ id: "demo/phone-number", key: "$.body.from" }],
                },
                usage: { model: { kind: "FREE" } },
            }),
        }],
    }];
}

/** Records whether the vendor was reached at all — the gate's promise is
 *  that a miss never touches upstream, so the COUNT is the assertion. */
function spyTransport(): { transport: Transport; calls: () => number } {
    let calls = 0;
    const transport = directTransport({
        params: () => Promise.resolve({ apiKey: "k" }),
        fetch: () => {
            calls++;
            return Promise.resolve(
                new Response(JSON.stringify({ ok: true }), { status: 200 }),
            );
        },
    });
    return { transport, calls: () => calls };
}

Deno.test("the ownership gate accepts a lookup key, and still 404s an unknown id", async () => {
    const dir = await Deno.makeTempDir({ prefix: "monid-kv-gate-" });
    const store = await KvResourceStore.open({
        path: `${dir}/local.db`,
        defs: (id) =>
            id === "demo/phone-number"
                ? { type: "phone_number", keys: { e164: "$.phoneNumber" } }
                : undefined,
    });
    try {
        const bundle = await compileBundle(gateConnector(), {
            compilerVersion: "0.1.0",
            builtWithEngineVersion: ENGINE_VERSION,
            catalogVersion: "0.0.0-test",
            generatedAt: "1970-01-01T00:00:00.000Z",
            leafCategories: [{ id: "demo-search", displayName: "Demo Search" }],
        });
        await store.provision({
            resource: "demo/phone-number",
            externalId: "num_1",
            identifier: "+14155550123",
            data: { phoneNumber: "+14155550123" },
        });

        const { transport, calls } = spyTransport();
        const engine = new Engine({ transport, resources: store });
        const loaded = await engine.load(sealUnit(bundle, "demo#call"));

        // the E.164 is NOT the externalId — before the index this was a
        // uniform 404, which is exactly what made the phone number a
        // decoy handle
        const byKey = await loaded.run({ body: { from: "+14155550123" } });
        assertEquals(byKey.kind, "COMPLETED");
        assertEquals(byKey.isProviderError, false);
        assertEquals(calls(), 1);

        // the primary handle keeps working, unchanged
        const byId = await loaded.run({ body: { from: "num_1" } });
        assertEquals(byId.isProviderError, false);
        assertEquals(calls(), 2);

        // and an unknown handle still fails CLOSED: 404 as data, zero
        // usage, upstream never touched. An index that widened the gate
        // would be a tenancy hole, not a convenience.
        const miss = await loaded.run({ body: { from: "+19999999999" } });
        assertEquals(miss.kind, "COMPLETED");
        assertEquals(miss.httpStatus, 404);
        assertEquals(miss.isProviderError, true);
        assertEquals(miss.usage.credits, {});
        assertEquals(calls(), 2);
    } finally {
        store.close();
        await Deno.remove(dir, { recursive: true });
    }
});

Deno.test("persistEffects carries the seed's identifier into the row", async () => {
    await withStore(async (store) => {
        const lines: string[] = [];
        await persistEffects(
            store,
            {
                provisions: [{
                    resource: RESOURCE,
                    externalId: "num_1",
                    identifier: "+14155550123",
                    data: { phoneNumber: "+14155550123" },
                }],
            },
            (line) => lines.push(line),
        );
        // the bug this replaces: `identifier` rode in on the seed and
        // was dropped at persist, so the store knew only the uuid
        assertEquals(
            (await store.get(RESOURCE, "num_1"))?.identifier,
            "+14155550123",
        );
        // and the log names the ADDRESS as well as the display handle —
        // the id is what the next command needs
        assert(lines[0].includes("num_1"), lines[0]);
        assert(lines[0].includes("+14155550123"), lines[0]);
    });
});
