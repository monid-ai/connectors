import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * /list-voices — the free, tenant-agnostic TTS voice catalog (v1
 * `catalogs/list-voices.ts`): plain declarative relay of `GET /voices`.
 */
export const zVoicesQuery = z.object({
    language: z.string().min(2).max(35).optional().describe(
        'Filter voices to one language (BCP-47, e.g. "en" or "en-US").',
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "List Voices",
        summary:
            "List the TTS voices an assistant can speak with (id, name, language).",
        description:
            "List selectable text-to-speech voices. Use a voice's id as " +
            "'connection.tts.voiceId' when provisioning or updating a " +
            "number's AI persona. Filter by language with the " +
            "'language' query param (values from /list-languages).",
        docsUrl: "https://saperly.com/docs/api-reference",
        categories: ["agentic-phone"],
    },
    endpoint: "/list-voices",
    request: { method: "GET", path: "/voices" },
    input: { schema: { queryParams: zVoicesQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
