import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, OwnedResource } from "@shared/core";
import { loadFixture, loadResource, testResourceUnit } from "@shared/testing";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";

/**
 * saperly/phone-number resource ops through the COMPILED doc (the same
 * sealed-unit path the host drives). Ops replay against MERGED chains,
 * driven sequentially on ONE loaded resource (fixture strategy v2 —
 * chains consume in order): the happy sequence (verify → release), the
 * degraded sequence (released verify → pointer-clearing refresh), and
 * the shared live persona view.
 */

const HERE = fromFileUrl(new URL("../../", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const ROW: OwnedResource = {
    resource: "saperly/phone-number",
    externalId: "num-1",
    data: {
        phoneNumber: "+14155559999",
        country: "US",
        numberType: "local",
        externalRefs: { connection: "conn-1" },
    },
};

Deno.test("saperly resource: the happy op sequence — verify (alive, observed usage) then release (+ connection teardown)", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("saperly/phone-number"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-ops"),
    });
    assertEquals(await resource.verify(ROW), {
        active: true,
        periodEndIso: "2026-10-16T00:00:00Z",
        observedUsage: { rent: { credit: "default", amount: 2 } },
    });
    assertEquals(await resource.release(ROW), { released: true });
});

Deno.test("saperly resource: the degraded sequence — released verify, then refresh CLEARS the pointer", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("saperly/phone-number"),
        mode: "replay",
        fixture: await fixture("synthetic-resource-degraded"),
    });
    const checked = await resource.verify(ROW);
    assertEquals(checked.active, false);
    assertEquals(checked.inactiveReason, "released_at:2026-09-15T00:00:00Z");
    const refreshed = await resource.refresh(ROW);
    assertEquals(refreshed.active, true);
    const patch = refreshed.patch as Record<string, Json>;
    assertEquals(patch.externalRefs, undefined); // authoritative clear
    // scalars carry forward on the degraded read
    assertEquals(patch.phoneNumber, "+14155559999");
    assertEquals(patch.country, "US");
});

Deno.test("saperly resource: the connection view is live and sanitized", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("saperly/phone-number"),
        mode: "replay",
        // the SAME chain /get-numbers replays — one reader, by design
        fixture: await fixture("synthetic-connection-read"),
    });
    const detail = await resource.view("connection", ROW) as Record<
        string,
        Json
    >;
    const connection = detail.connection as Record<string, Json>;
    assertEquals(connection.name, "Test persona");
    assertEquals(connection.id, undefined);
    assertEquals(connection.manualSecret, undefined);
});

Deno.test("saperly resource: a fixed line has no reconciler; foreign instances refused", async () => {
    const resource = await loadResource({
        unit: await testResourceUnit("saperly/phone-number"),
        mode: "replay",
        // no fixture: both refusals fire before any upstream call
    });
    await assertRejects(
        () =>
            resource.reconcileUsage("rent", ROW, {
                startIso: "2026-09-01T00:00:00Z",
                endIso: "2026-09-16T00:00:00Z",
            }),
        EngineError,
        "no reconcileUsage",
    );
    const foreign = await assertRejects(
        () => resource.verify({ ...ROW, resource: "saperly/other" }),
        EngineError,
    );
    assertEquals(
        (foreign as EngineError).code,
        EngineErrorCode.INVALID_INPUT,
    );
});
