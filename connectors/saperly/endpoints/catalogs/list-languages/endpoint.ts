import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * /list-languages — the free, tenant-agnostic spoken-language catalog (v1
 * `catalogs/list-languages.ts`): plain declarative relay of
 * `GET /languages`.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Languages",
        summary:
            "List the spoken languages an assistant can use (code + name).",
        description:
            "List supported spoken languages. Use a language's code as " +
            "'connection.language' when provisioning or updating a " +
            "number's AI persona, and to filter /list-voices.",
        docsUrl: "https://saperly.com/docs/api-reference",
        categories: ["agentic-phone"],
    },
    endpoint: "/list-languages",
    request: { method: "GET", path: "/languages" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
