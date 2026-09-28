import { assert, assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { testBundle, testResourceUnit, testSealedUnit } from "@shared/testing";
import type { Json, OwnedResource, RunInput } from "@shared/core";
import { catalog, coverage } from "./catalog.ts";

const PROVIDER_KEY = "ak_synthetic_provider";
const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CODE = "ahc_" + "s".repeat(43);
const ORIGIN = "https://app.ambiguous.ai";

function host(id: string) {
    const resources: OwnedResource[] = [];
    const calls: { url: string; method: string; body: unknown }[] = [];
    let inactive = false;
    let codeUsed = false;
    let status = 200;
    let output: Json = { id, workspace_id: id };
    const metadata = {
        id,
        workspace_id: id,
        principal_id: id,
        display_name: "Synthetic agent",
    };
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: PROVIDER_KEY }),
            fetch: async (input, init) => {
                const url = String(input);
                assertEquals(
                    new Headers(init?.headers).get("authorization"),
                    "Bearer " + PROVIDER_KEY,
                );
                calls.push({
                    url,
                    method: init?.method ?? "GET",
                    body: init?.body
                        ? JSON.parse(String(init.body))
                        : undefined,
                });
                if (url.endsWith("/connect")) {
                    if (codeUsed) {
                        return Response.json({ error: "Consumed code" }, {
                            status: 400,
                        });
                    }
                    codeUsed = true;
                    return Response.json(metadata);
                }
                if (url.endsWith("/create")) {
                    return Response.json({
                        ...metadata,
                        human: { claim_token_sent: true },
                    });
                }
                if (init?.method === "DELETE") {
                    inactive = true;
                    return new Response(null, { status: 204 });
                }
                if (inactive) {
                    return Response.json({ error: "Connection unavailable" }, {
                        status: 404,
                    });
                }
                if (url.includes("/operations/")) {
                    return Response.json({
                        http_status: status,
                        output,
                        headers: { "retry-after": "5" },
                    });
                }
                return Response.json(metadata);
            },
        }),
        resources: {
            owned: (query) =>
                Promise.resolve(
                    resources.filter((row) =>
                        row.resource === query.resource &&
                        (!query.externalId ||
                            query.externalId === row.externalId)
                    ),
                ),
        },
    });
    const run = async (name: string, input: RunInput = {}) => {
        const result =
            await (await engine.load(await testSealedUnit(`ambiguous#${name}`)))
                .run(input);
        for (const seed of result.resources?.provisions ?? []) {
            resources.push({
                resource: seed.resource,
                externalId: seed.externalId,
                data: seed.data,
            });
        }
        return result;
    };
    return {
        engine,
        run,
        resources,
        calls,
        revoke: () => {
            inactive = true;
        },
        respond: (code: number, body: Json) => {
            status = code;
            output = body;
        },
    };
}

async function connected(id = ID_A) {
    const h = host(id);
    const result = await h.run("connections/connect", {
        body: { setup_code: CODE, request_id: id },
    });
    assertEquals(result.httpStatus, 200);
    return h;
}

Deno.test("ambiguous: every MCP operation compiles on engine 0.5 with its complete JSON input and owned connection binding", async () => {
    const bundle = await testBundle();
    const expected = catalog.operations.map((op) =>
        `ambiguous#${op.operationId}`
    ).sort();
    const actual = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("ambiguous#") && !id.startsWith("ambiguous#connections/")
    ).sort();
    assertEquals(actual, expected);
    const report = JSON.parse(
        await Deno.readTextFile(new URL("./coverage.json", import.meta.url)),
    );
    assertEquals(report.totalOperations, coverage.length);
    assertEquals(report.includedOperations, expected.length);
    assertEquals(
        report.notExposedToMcp.map((op: { operationId: string }) =>
            op.operationId
        ).sort(),
        coverage.filter((op) => !op.exposed).map((op) => op.operationId).sort(),
    );
    for (const operation of catalog.operations) {
        const doc = bundle.endpoints[`ambiguous#${operation.operationId}`];
        assertEquals(doc.request.method, "POST");
        assertEquals(
            doc.request.url,
            ORIGIN +
                "/api/provider-connections/{monid_connection}/operations/" +
                operation.operationId,
        );
        assertEquals(
            doc.resources?.uses?.[0].key,
            "$.pathParams.monid_connection",
        );
        assertEquals(doc.minEngineVersion, "0.5.0");
        const body = doc.input.schema.body as {
            properties: Record<string, unknown>;
        };
        assertEquals(
            Object.keys(body.properties).sort(),
            Object.keys(operation.inputs).sort(),
        );
    }
    assert(bundle.endpoints["ambiguous#send_email"]);
    assert(bundle.endpoints["ambiguous#audio_transcribe"]);
    assertEquals(bundle.endpoints["ambiguous#generate_image"], undefined);
});

Deno.test("ambiguous: both setup paths return owned metadata and customer isolation is enforced before transport", async () => {
    const a = host(ID_A);
    const created = await a.run("connections/create", {
        body: {
            request_id: ID_A,
            agent_display_name: "Synthetic agent",
            human_email: "owner@example.test",
        },
    });
    assertEquals(created.httpStatus, 200);
    const b = await connected(ID_B);
    assert(
        !JSON.stringify([created, a.resources, b.resources]).includes("ak_"),
    );
    const result = await a.run("auth_whoami", {
        pathParams: { monid_connection: ID_A },
        body: {},
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        http_status: 200,
        output: { id: ID_A, workspace_id: ID_A },
        headers: { "retry-after": "5" },
    });
    const count = a.calls.length;
    const denied = await a.run("auth_whoami", {
        pathParams: { monid_connection: ID_B },
        body: {},
    });
    assertEquals(denied.httpStatus, 404);
    assertEquals(a.calls.length, count);
    assertEquals((await a.run("connections/list")).output, [{
        connectionId: ID_A,
        workspaceId: ID_A,
        principalId: ID_A,
        displayName: "Synthetic agent",
    }]);
    const failed = await b.run("connections/connect", {
        body: { request_id: ID_A, setup_code: CODE },
    });
    assertEquals(failed.httpStatus, 400);
    assertEquals(b.resources.length, 1);
    assertEquals(
        b.calls.filter((call) => call.url.endsWith("/create")).length,
        0,
    );
});

Deno.test("ambiguous: resource release calls the provider adapter and revoked delegations remain errors", async () => {
    const h = await connected();
    const resource = await h.engine.loadResource(
        await testResourceUnit("ambiguous/connection"),
    );
    assertEquals(await resource.verify(h.resources[0]), { active: true });
    assertEquals((await resource.refresh(h.resources[0])).active, true);
    const result = await h.run("connections/disconnect", {
        pathParams: { monid_connection: ID_A },
    });
    assertEquals(result.resources?.releases?.[0].externalId, ID_A);
    await resource.release(h.resources[0]);
    assertEquals(h.calls.at(-1)?.method, "DELETE");
    assertEquals(await resource.verify(h.resources[0]), {
        active: false,
        inactiveReason: "Connection unavailable",
    });
    assertEquals(
        (await h.run("auth_whoami", {
            pathParams: { monid_connection: ID_A },
            body: {},
        })).httpStatus,
        404,
    );
});

Deno.test("ambiguous: file envelopes, explicit nulls, query inputs and required headers survive ordinary JSON transport", async () => {
    const h = await connected();
    const pathParams = { monid_connection: ID_A };
    const file = {
        filename: "pixel.png",
        contentType: "image/png",
        dataBase64: "AP+AQQ==",
    };
    await h.run("chat_emoji_create", {
        pathParams,
        body: { body: { name: "synthetic", image: file } },
    });
    assertEquals(h.calls.at(-1)?.body, {
        body: { name: "synthetic", image: file },
    });
    const patch = {
        pathParams: { id: ID_B },
        body: { assignee_id: null, due_date: null, status: "done" },
    };
    await h.run("update_task", { pathParams, body: patch });
    assertEquals(h.calls.at(-1)?.body, patch);
    const query = {
        queryParams: { limit: 5, offset: null, cursor: "next-page" },
    };
    await h.run("list_documents", { pathParams, body: query });
    assertEquals(h.calls.at(-1)?.body, query);
    const rotation = {
        pathParams: { calendar_id: ID_B },
        headers: { "Idempotency-Key": "synthetic-retry" },
    };
    await h.run("rotate_calendar_publish_url", { pathParams, body: rotation });
    assertEquals(h.calls.at(-1)?.body, rotation);
    await assertRejects(() =>
        h.run("rotate_calendar_publish_url", {
            pathParams,
            body: { pathParams: { calendar_id: ID_B } },
        })
    );
    await assertRejects(() =>
        h.run("auth_whoami", {
            pathParams,
            body: { headers: { Authorization: "injected" } },
        })
    );
});

Deno.test("ambiguous: destination errors, response metadata, binary data and finite streams remain lossless", async () => {
    const h = await connected();
    const pathParams = { monid_connection: ID_A };
    h.respond(429, { error: "Quota exhausted" });
    const failed = await h.run("auth_whoami", { pathParams, body: {} });
    assertEquals(failed.httpStatus, 429);
    assertEquals(failed.usage.credits, {});
    assertEquals(failed.output, {
        http_status: 429,
        output: { error: "Quota exhausted" },
        headers: { "retry-after": "5" },
    });
    const binary = {
        encoding: "base64",
        contentType: "application/pdf",
        dataBase64: "AP+AQQ==",
    };
    h.respond(200, binary);
    const exported = await h.run("export_document", {
        pathParams,
        body: { pathParams: { id: ID_B }, body: { format: "pdf" } },
    });
    assertEquals((exported.output as { output: Json }).output, binary);
    const stream = {
        encoding: "utf8",
        contentType: "text/event-stream",
        text: "data: first\n\ndata: second\n\n",
    };
    h.respond(200, stream);
    const completed = await h.run("documents_completions", {
        pathParams,
        body: { body: { document_id: ID_B, prompt: "Continue" } },
    });
    assertEquals((completed.output as { output: Json }).output, stream);
});
