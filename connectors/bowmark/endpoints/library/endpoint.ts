import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBowmarkLibraryQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/library: the callable vocabulary, as Markdown inside JSON.
 *
 * `Accept: application/json` selects the JSON envelope
 * `{library, query, queries}`; without it Bowmark answers raw Markdown.
 * Free: a library read touches no website (design D3).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bowmark Library",
        summary:
            "Look up which Bowmark functions cover a task, with their exact types.",
        description: "Returns the part of Bowmark's function library that " +
            "matches a task or a site: capabilities such as " +
            "`bowmark.flights.search` that fan out across several sites, " +
            "plus that site's own provider (`bowmark.providers.kayak`) " +
            "when you named one, each with argument and return types and " +
            "examples, as Markdown in `library`. Touches no website and " +
            "is free, so call it first, once per part of the task. A " +
            "query that matches nothing returns an index of the whole " +
            "library, never an error. Then write a script against these " +
            "names and send it to Bowmark /run.",
        docsUrl: "https://bowmark.ai/docs/quickstart",
        categories: ["web-automation"],
        notes: ["Free. A library read never touches a website."],
    },
    request: {
        method: "GET",
        path: "/library",
        headers: { Accept: "application/json" },
    },
    input: {
        schema: {
            queryParams: zBowmarkLibraryQueryParams.extend({
                query: zBowmarkLibraryQueryParams.shape.query.unwrap()
                    .min(1).optional(),
            }),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
