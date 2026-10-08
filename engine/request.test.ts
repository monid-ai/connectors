import { assertEquals, assertNotStrictEquals, assertThrows } from "@std/assert";
import type { EndpointDoc, Json } from "@shared/core";
import { validateInput } from "./request.ts";

function doc(schema: EndpointDoc["input"]["schema"]): EndpointDoc {
    // validateInput only reads these fields; no compiler/linking needed here.
    return { id: "test#input", input: { schema } } as EndpointDoc;
}

Deno.test("validateInput: parsed input owns its nested defaults without a second clone", () => {
    const endpoint = doc({
        body: {
            type: "object",
            properties: {
                settings: {
                    type: "object",
                    properties: { limit: { type: "integer", default: 10 } },
                },
                rows: { type: "array", items: { type: "object" } },
            },
        },
        queryParams: {
            type: "object",
            properties: {
                tags: { type: "array", items: { type: "string" } },
                limit: { type: "integer", default: 5 },
            },
        },
        pathParams: {
            type: "object",
            properties: { version: { type: "string", default: "v1" } },
        },
    });
    const original = {
        body: { settings: {}, rows: [{ nested: { value: 1 } }] },
        queryParams: { tags: ["a", "b"] },
        pathParams: {},
    };
    const clone = globalThis.structuredClone;
    let clones = 0;
    globalThis.structuredClone = ((...args: Parameters<typeof clone>) => {
        clones++;
        return clone(...args);
    }) as typeof clone;
    try {
        const input = validateInput(endpoint, original);
        assertEquals(original, {
            body: { settings: {}, rows: [{ nested: { value: 1 } }] },
            queryParams: { tags: ["a", "b"] },
            pathParams: {},
        });
        assertEquals(input.body, {
            settings: { limit: 10 },
            rows: [{ nested: { value: 1 } }],
        });
        assertEquals(input.queryParams, { tags: ["a", "b"], limit: 5 });
        assertEquals(input.pathParams, { version: "v1" });
        assertNotStrictEquals(input.body, original.body);
        assertNotStrictEquals(
            (input.body as Record<string, Json>).rows,
            original.body.rows,
        );
        (input.body as typeof original.body).rows[0].nested.value = 2;
        (input.queryParams!.tags as string[]).push("c");
        assertEquals(original.body.rows[0].nested.value, 1);
        assertEquals(original.queryParams.tags, ["a", "b"]);
        assertEquals(
            clones,
            0,
            "zRunInput already deep-copies JSON; avoid duplicating it",
        );
    } finally {
        globalThis.structuredClone = clone;
    }
});

Deno.test("validateInput: defaults preceding rejection never mutate caller data", () => {
    const endpoint = doc({
        body: {
            type: "object",
            properties: {
                nested: {
                    type: "object",
                    properties: { limit: { type: "integer", default: 3 } },
                },
                requiredText: { type: "string" },
            },
            required: ["requiredText"],
        },
    });
    const original = { body: { nested: {} } };
    assertThrows(() => validateInput(endpoint, original), Error, "input.body");
    assertEquals(original, { body: { nested: {} } });
});

Deno.test("validateInput: nested object defaults belong independently to each call", () => {
    const endpoint = doc({
        body: {
            type: "object",
            properties: {
                options: { type: "object", default: { tags: ["a"] } },
            },
        },
    });
    const a = validateInput(endpoint, { body: {} });
    const b = validateInput(endpoint, { body: {} });
    (((a.body as Record<string, Json>).options as Record<string, Json>)
        .tags as string[]).push("b");
    assertEquals(b.body, { options: { tags: ["a"] } });
    assertEquals(
        (endpoint.input.schema.body!.properties as Record<string, Json>)
            .options,
        {
            type: "object",
            default: { tags: ["a"] },
        },
    );
});
