import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, RunKind, StopKind } from "@shared/core";
import { fnUtils } from "@monid/connector-engine";
import {
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import provider from "./provider.ts";

/**
 * THE saperly suite — the resource lifecycle's proving connector
 * (openspec: add-resource-lifecycle-saperly). Chains are SYNTHETIC (the
 * carrier hands out neither failures nor money on request); each states
 * what it exercises. Ownership is the FIXTURE's story: `resources` seeds
 * the reader; foreign ids prove the uniform 404.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

/** The one owned row every ownership test seeds. */
const OWNED: OwnedResource[] = [{
    resource: "saperly/phone-number",
    externalId: "num-1",
    data: {
        phoneNumber: "+14155559999",
        country: "US",
        numberType: "local",
        externalRefs: { connection: "conn-1" },
    },
    syncedAt: "2026-09-16T00:00:00.000Z",
}];

const PROVISION_INPUT = {
    body: {
        connection: { name: "Test persona", instructions: "Be helpful." },
    },
};
const CALL_INPUT = { body: { fromNumberId: "num-1", to: "+14155550123" } };

const NOOP_LOGGER = {
    debug() {},
    info() {},
    warn() {},
    error() {},
};

// ---------------------------------------------------------------------------
// provision-numbers — the 4-call saga
// ---------------------------------------------------------------------------

// RATE TABLE under test (https://saperly.com/docs/pricing, confirmed
// 2026-09-16): $2/month number rent, $0.28 per started call minute,
// $0.025 per SMS segment — the pins below are the vendor's tiers.
Deno.test("saperly provision: happy saga — seed, quote claim, stripped output", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-provision-happy"),
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    // the consolidate claim (the consented $2 quote) equals the derived
    // PER_CALL fold — claim wins, no mismatch
    assertEquals(result.usage.credits, { default: 2 });
    assertEquals(result.usage.mismatch, undefined);
    // the CREATES seed — the host's provision record
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined, "expected a provision seed");
    assertEquals(seed.resource, "saperly/phone-number");
    assertEquals(seed.externalId, "num-1");
    assertEquals(seed.identifier, "+14155559999");
    assertEquals(seed.observedUsage, {
        rent: { credit: "default", amount: 2 },
    });
    assertEquals(
        (seed.data as Record<string, Json>).externalRefs,
        { connection: "conn-1" },
    );
    // the user-facing strip: no internals, no quote stamps, and the
    // connection re-projected WITHOUT its id
    const out = result.output as Record<string, Json>;
    assertEquals(out.monthlyPriceCents, undefined);
    assertEquals(out.connectionId, undefined);
    assertEquals(out.quoteUpfrontCents, undefined);
    const connection = out.connection as Record<string, Json>;
    assertEquals(connection.id, undefined);
    assertEquals(connection.manualSecret, undefined);
    assertEquals(connection.instructions, "Be helpful.");
});

Deno.test("saperly provision: ONE PriceChanged retry re-consents at the actual price", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-provision-price-changed"),
    });
    assertEquals(result.httpStatus, 201);
    // the retried consent ($2.50) is the claim; the $2 card rides as the
    // derived mismatch — said, never hidden
    assertEquals(result.usage.credits, { default: 2.5 });
    assertEquals(result.usage.mismatch?.derived, { default: 2 });
    assertEquals(
        result.resources?.provisions?.[0].observedUsage,
        { rent: { credit: "default", amount: 2.5 } },
    );
});

Deno.test("saperly provision: a bind failure degrades — connection-less seed, orphan deleted", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-provision-degraded-bind"),
    });
    assertEquals(result.httpStatus, 201);
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined);
    assertEquals(
        (seed.data as Record<string, Json>).externalRefs,
        undefined,
    );
});

Deno.test("saperly provision: an ambiguous bind that COMMITTED reconciles as bound — connection kept", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        // bind 500s, but the reconcile read shows OUR connection attached
        // — the fixture ends WITHOUT a DELETE (a delete would fail replay)
        fixture: await fixture("synthetic-provision-bind-reconciled"),
    });
    assertEquals(result.httpStatus, 201);
    const seed = result.resources?.provisions?.[0];
    assert(seed !== undefined);
    assertEquals(
        (seed.data as Record<string, Json>).externalRefs,
        { connection: "conn-1" },
    );
});

Deno.test("saperly provision: a malformed quote fails closed as OUR 502, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-provision-malformed-quote"),
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources, undefined);
});

Deno.test("saperly provision: connection-first fails fast — no purchase, no seed", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#provision-numbers"),
        input: PROVISION_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-provision-conn-failed"),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources, undefined);
});

// ---------------------------------------------------------------------------
// place-calls — the metered async run
// ---------------------------------------------------------------------------

Deno.test("saperly place-calls: the run IS the call — grace parks the settle race, then bills the carrier record", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        // ONE chain (merged happy + settle-grace): mid-flight RUNNING,
        // two terminal-but-unsettled reads on the graceLeft countdown,
        // then the settled record
        fixture: await fixture("synthetic-call-settled"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    // the carrier-settled charge is the claim; the rate-card fold rides
    // as the derived mismatch (evidence: 53 s → ceil(53/60) × $0.28)
    assertEquals(result.usage.credits, { default: 0.25 });
    assertEquals(result.usage.mismatch?.derived, { default: 0.28 });
    assertEquals(result.usage.evidence, { SECOND: 53 });
    // four polls: running + two grace parks + the settled read
    assertEquals(result.timing.attempts, 4);
    // the USES settle mark — the host's reconcile tick
    assertEquals(result.resources?.reconciles, [{
        resource: "saperly/phone-number",
        externalId: "num-1",
    }]);
    // the strip holds on call objects too
    const out = result.output as Record<string, Json>;
    assertEquals(out.costCents, undefined);
    assertEquals(out.rateCentsPerMin, undefined);
});

Deno.test("saperly place-calls: FOREIGN number → the uniform 404, zero usage, upstream untouched", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: { body: { fromNumberId: "num-FOREIGN", to: "+14155550123" } },
        mode: "replay",
        // no fixture: the gate must fire before ANY upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
    assertEquals(result.timing.attempts, 0);
});

Deno.test("saperly place-calls: born-terminal zero-second call bills zero", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-call-born-terminal"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { SECOND: 0 });
    assertEquals(result.usage.credits, {});
});

Deno.test("saperly place-calls: an upstream refusal is data — zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-call-start-rejected"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
});

Deno.test("saperly place-calls: STOP settles the metered work (design D34)", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-call-stop-settled"),
        resources: OWNED,
    });
    const run = { runId: "test-run-1" };
    const started = await loaded.start(CALL_INPUT, run);
    assertEquals(started.kind, RunKind.RUNNING);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(CALL_INPUT, started.state, run);
    assert(stopped.kind === RunKind.COMPLETED, "stop settles");
    assertEquals(stopped.usage.credits, { default: 0.25 });
    assertEquals(stopped.usage.evidence, { SECOND: 53 });
});

Deno.test("saperly place-calls: STOP that cannot observe settlement is UNRESOLVED", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        fixture: await fixture("synthetic-call-stop-unresolved"),
        resources: OWNED,
    });
    const run = { runId: "test-run-2" };
    const started = await loaded.start(CALL_INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(CALL_INPUT, started.state, run);
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
    assert(stopped.kind === StopKind.UNRESOLVED);
    assertEquals(stopped.state.externalRunId, "call-1");
});

Deno.test("saperly place-calls: estimate floors at one minute; accrued() prices the mid-flight", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit("saperly#place-calls"),
        input: CALL_INPUT,
        mode: "replay",
        // no fixture: estimate/accrued are PURE — zero upstream calls
        resources: OWNED,
    });
    // admission: elapsedMs absent → the fn's 60 s floor → 1 × $0.28
    assertEquals(loaded.estimate(CALL_INPUT).credits, { default: 0.28 });
    // the SAME estimate re-run mid-flight (design D40): 240 s elapsed →
    // ceil(240/60) = 4 × $0.28
    assertEquals(
        loaded.accrued(CALL_INPUT, 240_000).credits,
        { default: 1.12 },
    );
});

// ---------------------------------------------------------------------------
// the reader-backed number endpoints
// ---------------------------------------------------------------------------

Deno.test("saperly list-numbers: served from the ownership window only", async () => {
    const unit = await testSealedUnit("saperly#list-numbers");
    const seeded = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        // no fixture: served from the reader alone — zero upstream calls
        resources: OWNED,
    });
    assertEquals(seeded.httpStatus, 200);
    assertEquals(seeded.output, [{
        numberId: "num-1",
        phoneNumber: "+14155559999",
        country: "US",
        numberType: "local",
        hasConnection: true,
        syncedAt: "2026-09-16T00:00:00.000Z",
    }]);
    const empty = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        resources: [],
    });
    assertEquals(empty.output, []);
});

Deno.test("saperly get-numbers: row + LIVE persona in one call, projected", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#get-numbers"),
        input: { body: { numberId: "num-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-connection-read"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const out = result.output as Record<string, Json>;
    assertEquals(out.numberId, "num-1");
    const connection = out.connection as Record<string, Json>;
    assertEquals(connection.id, undefined);
    assertEquals(connection.manualSecret, undefined);
    assertEquals(connection.name, "Test persona");
});

Deno.test("saperly get-numbers: foreign id → the uniform 404 from the pre-gate", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#get-numbers"),
        input: { body: { numberId: "num-FOREIGN" } },
        mode: "replay",
        // no fixture: the pre-gate answers before any upstream call
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.usage.credits, {});
});

Deno.test("saperly update-numbers: PATCH in place; a success marks the refresh", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#update-numbers"),
        input: {
            body: {
                numberId: "num-1",
                connection: { instructions: "Be brief." },
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-update-patch"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, { numberId: "num-1", status: "updated" });
    assertEquals(result.resources?.refreshes, [{
        resource: "saperly/phone-number",
        externalId: "num-1",
    }]);
});

Deno.test("saperly update-numbers: a STALE pointer repairs (create + bind)", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#update-numbers"),
        input: {
            body: {
                numberId: "num-1",
                connection: { instructions: "Be brief." },
            },
        },
        mode: "replay",
        fixture: await fixture("synthetic-update-repair"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        result.output,
        { numberId: "num-1", status: "connection_created" },
    );
});

Deno.test("saperly update-numbers: an ambiguous repair bind reconciles as bound — no delete", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#update-numbers"),
        input: {
            body: {
                numberId: "num-1",
                connection: { instructions: "Be brief." },
            },
        },
        mode: "replay",
        // repair-bind 500s; the reconcile read shows the number attached
        // to the fresh connection — the fixture ends WITHOUT a DELETE
        fixture: await fixture("synthetic-update-repair-ambiguous"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        result.output,
        { numberId: "num-1", status: "connection_created" },
    );
});

Deno.test("saperly release-numbers: local ack + the RELEASES settle mark", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#release-numbers"),
        input: { body: { numberId: "num-1" } },
        mode: "replay",
        // no fixture: a LOCAL ack — zero upstream calls
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.usage.credits, {});
    assertEquals(result.resources?.releases, [{
        resource: "saperly/phone-number",
        externalId: "num-1",
    }]);
});

// ---------------------------------------------------------------------------
// call history + artifacts (the anchor pattern)
// ---------------------------------------------------------------------------

Deno.test("saperly list-calls: the pooled list never leaves unfiltered", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#list-calls"),
        input: { queryParams: { numberId: "num-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-list-calls"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    const items = result.output as Json[];
    assertEquals(items.length, 1);
    assertEquals((items[0] as Record<string, Json>).id, "call-1");
});

Deno.test("saperly call-transcripts: anchor pair check, then the artifact", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#call-transcripts"),
        input: { body: { numberId: "num-1", callId: "call-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-call-anchor-transcript"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(
        (result.output as Record<string, Json>).callId,
        "call-1",
    );
});

Deno.test("saperly call-transcripts: a mismatched pair is the uniform 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#call-transcripts"),
        input: { body: { numberId: "num-1", callId: "call-9" } },
        mode: "replay",
        fixture: await fixture("synthetic-call-anchor-mismatch"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
});

Deno.test("saperly call-recordings: the 302 location header becomes the artifact", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#call-recordings"),
        input: { body: { numberId: "num-1", callId: "call-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-recording-redirect"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.providerHttpStatus, 302);
    assertEquals(
        (result.output as Record<string, Json>).recordingUrl,
        "https://cdn.saperly.example/rec/call-1.mp3?sig=abc",
    );
});

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

Deno.test("saperly send-messages: declarative relay behind the ownership gate", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#send-messages"),
        input: {
            body: { fromNumberId: "num-1", to: "+14155550123", body: "hello" },
        },
        mode: "replay",
        fixture: await fixture("synthetic-send-message"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.usage.credits, { default: 0.025 });
    assertEquals(result.resources?.reconciles, [{
        resource: "saperly/phone-number",
        externalId: "num-1",
    }]);
});

Deno.test("saperly list-messages: gated declarative filter relay", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#list-messages"),
        input: { queryParams: { numberId: "num-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-list-messages"),
        resources: OWNED,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals((result.output as Json[]).length, 1);
});

// ---------------------------------------------------------------------------
// webhooks — the pure fns off the provider def
// ---------------------------------------------------------------------------

const hook = provider.webhooks!["number-events"];
const delivery = (body: Json, headers: Record<string, string> = {}) => ({
    data: { delivery: { headers, body } },
    utils: fnUtils,
    logger: NOOP_LOGGER,
});

Deno.test("saperly webhooks: route WHO — resource, alias, run, unhandled", () => {
    assertEquals(
        hook.route(delivery({
            eventType: "message.received",
            payload: { numberId: "num-1", messageId: "msg-1" },
        })).who,
        {
            kind: "resource",
            target: {
                resource: "saperly/phone-number",
                externalId: "num-1",
            },
        },
    );
    assertEquals(
        hook.route(delivery({
            eventType: "call.received",
            payload: { callId: "call-1", to: "+14155559999" },
        })).who,
        { kind: "alias", e164: "+14155559999" },
    );
    assertEquals(
        hook.route(delivery({
            eventType: "call.completed",
            payload: { callId: "call-1" },
        })).who,
        { kind: "run", externalRunId: "call-1" },
    );
    // nothing readable: who unhandled, what ignore — ONE verdict
    assertEquals(
        hook.route(delivery({ eventType: "billing.rotated" })),
        {
            who: { kind: "unhandled", event: "billing.rotated" },
            what: { action: "ignore" },
        },
    );
});

Deno.test("saperly webhooks: route WHAT — the v1 action table", () => {
    const inbound = hook.route(delivery({
        eventType: "message.received",
        payload: {
            messageId: "msg-1",
            numberId: "num-1",
            from: "+15550001111",
            to: "+14155559999",
            body: "hi",
            segments: 1,
        },
    })).what;
    assertEquals(inbound, {
        action: "run",
        endpoint: "saperly#inbound-messages",
        input: {
            body: {
                messageId: "msg-1",
                numberId: "num-1",
                from: "+15550001111",
                to: "+14155559999",
                body: "hi",
                segments: 1,
            },
        },
        runKey: "sms:msg-1",
        controlPolicy: "bill-only",
    });
    const call = hook.route(delivery({
        eventType: "call.received",
        payload: { callId: "call-1", to: "+14155559999" },
    })).what;
    assert(call.action === "run");
    assertEquals(call.endpoint, "saperly#inbound-calls");
    assertEquals(call.runKey, "call-1");
    assertEquals(call.controlPolicy, "admit-overdraft");
    assertEquals(
        hook.route(delivery({
            eventType: "call.completed",
            payload: { callId: "call-1" },
        })).what,
        { action: "signal-run", runKey: "call-1" },
    );
    assertEquals(
        hook.route(delivery({
            eventType: "number.compliance.updated",
            payload: { numberId: "num-1" },
        })).what,
        {
            action: "refresh",
            target: {
                resource: "saperly/phone-number",
                externalId: "num-1",
            },
        },
    );
    // a number.* payload carrying only the generic `id` still correlates
    // to the RESOURCE (never a run) — who and what agree on one verdict
    assertEquals(
        hook.route(delivery({
            eventType: "number.deleted",
            payload: { id: "num-9" },
        })),
        {
            who: {
                kind: "resource",
                target: {
                    resource: "saperly/phone-number",
                    externalId: "num-9",
                },
            },
            what: {
                action: "refresh",
                target: {
                    resource: "saperly/phone-number",
                    externalId: "num-9",
                },
            },
        },
    );
    // stated policy: outbound receipts map (who: resource) but IGNORE
    assertEquals(
        hook.route(delivery({ eventType: "message.sent" })).what,
        { action: "ignore" },
    );
});

// ---------------------------------------------------------------------------
// inbound endpoints (webhook-dispatched)
// ---------------------------------------------------------------------------

Deno.test("saperly inbound-messages: the event summary IS the billed output", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("saperly#inbound-messages"),
        input: { body: { messageId: "msg-1", numberId: "num-1", body: "hi" } },
        mode: "replay",
        // no fixture: the event summary IS the output — zero upstream calls
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.025 });
    assertEquals(
        (result.output as Record<string, Json>).messageId,
        "msg-1",
    );
});

Deno.test("saperly inbound-calls: adopts the event callId and shares the call lifecycle", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit("saperly#inbound-calls"),
        input: { body: { callId: "call-1" } },
        mode: "replay",
        fixture: await fixture("synthetic-call-stop-settled"),
    });
    const input = { body: { callId: "call-1" } };
    const run = { runId: "test-run-3" };
    const started = await loaded.start(input, run);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "call-1");
    // the fixture's start POST is unconsumed (LOCAL adopt); the shared
    // stop drains against the same chain shape
    const chain = await fixture("synthetic-call-stop-settled");
    const reloaded = await loadEndpoint({
        unit: await testSealedUnit("saperly#inbound-calls"),
        input,
        mode: "replay",
        fixture: {
            ...chain,
            calls: chain.calls.slice(1), // drop the outbound POST
        },
    });
    const stopped = await reloaded.stop(input, started.state, run);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 0.25 });
});

// ---------------------------------------------------------------------------
// live (gated: SAPERLY_API_KEY; money cases additionally SAPERLY_LIVE_SPEND=1
// — none automated here: provisioning + calls move real money and need a
// teardown release; run them deliberately via `deno task engine:run`)
// ---------------------------------------------------------------------------

Deno.test({
    name: "saperly live: list-voices answers the catalog",
    ignore: liveSkip("saperly"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("saperly#list-voices"),
            input: {},
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(Array.isArray(result.output));
    },
});
