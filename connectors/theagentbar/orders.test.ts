import { assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { loadEndpoint, replayFetch, testSealedUnit } from "@shared/testing";
import type { Json } from "@shared/core";
import { orderBody, orderFixture, orderRates, orderRun } from "./testing.ts";

Deno.test("theagentbar: every purchase requires a confirmed Backbar publication before billing", async (t) => {
    const publications: Array<[string, Json | undefined]> = [
        ["missing publication", undefined],
        ["null publication", null],
        ["missing published flag", { id: "note_fixture" }],
        ["unpublished message", { published: false, id: "note_fixture" }],
        ["non-boolean published flag", {
            published: "true",
            id: "note_fixture",
        }],
        ["missing publication ID", { published: true }],
        ["null publication ID", { published: true, id: null }],
        ["non-string publication ID", { published: true, id: 123 }],
        ["empty publication ID", { published: true, id: "" }],
    ];
    for (
        const slug of Object.keys(orderRates) as Array<keyof typeof orderRates>
    ) {
        const unit = await testSealedUnit(
            `theagentbar#api/partners/monid/v1/drinks/${slug}`,
        );
        for (const [name, publication] of publications) {
            await t.step(`${slug}: ${name}`, async () => {
                const fixture = await orderFixture(slug);
                const body = fixture.calls[0].res.body as Record<string, Json>;
                if (publication === undefined) delete body.backbar_post;
                else body.backbar_post = publication;
                const input = { body: orderBody };
                const endpoint = await loadEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    fixture,
                });
                const result = await endpoint.start(input, orderRun);
                assertEquals(result.kind, "COMPLETED");
                if (result.kind !== "COMPLETED") {
                    throw new Error("Expected synchronous completion");
                }
                assertEquals(result.httpStatus, 502);
                assertEquals(result.isProviderError, true);
                assertEquals(result.usage, { credits: {}, evidence: {} });
                assertEquals(result.output, {
                    error: "unconfirmed_fulfilment",
                    message:
                        "Use the free get-order operation with the original nonce. Do not create another purchase.",
                });
            });
        }
    }
});

Deno.test("theagentbar: egress binds each purchase to the host run, vendor price, and restricted credential", async () => {
    for (
        const slug of Object.keys(orderRates) as Array<keyof typeof orderRates>
    ) {
        const unit = await testSealedUnit(
            `theagentbar#api/partners/monid/v1/drinks/${slug}`,
        );
        const fixture = await orderFixture(slug);
        const replay = replayFetch(fixture, {
            "request.url": unit.doc.request.url,
        });
        let calls = 0;
        const endpoint = await new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "synthetic-restricted-key" }),
                fetch: (url, init) => {
                    calls++;
                    const headers = new Headers(init?.headers);
                    assertEquals(
                        headers.get("authorization"),
                        "Bearer synthetic-restricted-key",
                    );
                    assertEquals(
                        headers.get("idempotency-key"),
                        orderRun.runId,
                    );
                    assertEquals(
                        headers.get("x-theagentbar-price-minor"),
                        String(orderRates[slug].price * 100),
                    );
                    assertEquals(JSON.parse(String(init?.body)), orderBody);
                    return replay(url, init);
                },
            }),
        }).load(unit);
        const result = await endpoint.start({ body: orderBody }, orderRun);
        assertEquals(result.kind, "COMPLETED");
        assertEquals(calls, 1);
    }
});

Deno.test("theagentbar: malformed success, wrong run, price, or receipt returns uncharged 502", async () => {
    const unit = await testSealedUnit(
        "theagentbar#api/partners/monid/v1/drinks/context-window-collins",
    );
    const changes: Array<(value: Record<string, any>) => Json> = [
        () => null,
        () => [],
        () => "not an order",
        (value) => ({ ...value, status: "pending" }),
        (value) => ({ ...value, billing: [] }),
        (value) => ({
            ...value,
            billing: { ...value.billing, run_id: "another-run" },
        }),
        (value) => ({
            ...value,
            billing: { ...value.billing, amount_minor: 250 },
        }),
        (value) => ({
            ...value,
            billing: { ...value.billing, amount_minor: "50" },
        }),
        (value) => ({ ...value, receipt: null }),
        (value) => ({
            ...value,
            receipt: { ...value.receipt, amount: "2.50" },
        }),
        (value) => ({
            ...value,
            receipt: { ...value.receipt, paymentMethod: "stripe" },
        }),
        (value) => ({
            ...value,
            receipt: { ...value.receipt, signature: false },
        }),
        (value) => ({
            ...value,
            receipt: { ...value.receipt, publicCode: 123 },
        }),
        (value) => ({
            ...value,
            experience: { ...value.experience, text: "" },
        }),
        (value) => ({
            ...value,
            experience: { ...value.experience, text: {} },
        }),
        (value) => ({
            ...value,
            experience: { ...value.experience, drink: "wrong-drink" },
        }),
    ];
    for (const change of changes) {
        const fixture = await orderFixture("context-window-collins");
        fixture.calls[0].res.body = change(
            fixture.calls[0].res.body as Record<string, any>,
        );
        const input = { body: orderBody };
        const endpoint = await loadEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        const result = await endpoint.start(input, orderRun);
        if (result.kind !== "COMPLETED") throw new Error("Expected completion");
        assertEquals(result.httpStatus, 502);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, {
            error: "unconfirmed_fulfilment",
            message:
                "Use the free get-order operation with the original nonce. Do not create another purchase.",
        });
    }
});
