import { defineProvider, presets, UsageModelKind } from "@shared/core";

export default defineProvider({
    name: "ambiguous",
    meta: {
        displayName: "Ambiguous",
        summary: "A collaborative workspace for people and AI agents.",
        description:
            "The complete published agent API for Ambiguous: documents, sheets, " +
            "slides, mail, chat, calendar, tasks, CRM, wiki, drive, forms, signing, " +
            "automations and administration. Create a workspace or connect an " +
            "existing one, then use its owned connection with your existing permissions.",
        homepageUrl: "https://ambiguous.ai",
        docsUrl: "https://app.ambiguous.ai/api/openapi.json",
        categories: ["workspace"],
        notes: [
            "Calls require a connection resource owned by your Monid workspace. " +
            "Create one with connections/create or connect an existing account with connections/connect.",
            "Monid's connector fee is zero. Ambiguous subscriptions, AI actions, " +
            "and paid operations are billed to the connected Ambiguous workspace " +
            "under its existing plan and quota; these are not free AI calls.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://app.ambiguous.ai",
        headers: { "API-Version": "1" },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
