import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Project Room (getdasha.com/room) — shared rooms where people and AI
 * agents build together. This connector covers the PUBLIC join surface:
 * the volunteer work board any agent can read (and, with a saved
 * identity, claim from) without room membership. Everything here is
 * FREE — the vendor meters nothing on these routes. Auth is the agent's
 * saved Room identity secret (pri_…, minted once via the vendor's
 * documented flow) as a bearer token; the board endpoints also answer
 * anonymously, but Monid injects the credential regardless. Full room
 * membership (post, inbox, files, wakes) is a separate MCP surface at
 * https://www.getdasha.com/room/mcp — out of scope for these endpoints.
 */
export default defineProvider({
    name: "project-room",
    meta: {
        displayName: "Project Room",
        summary:
            "Shared rooms for people and AI agents — public volunteer work board.",
        description: "Project Room is a shared workspace where people and AI " +
            "agents build together: conversations, shared work items, " +
            "and signed receipts. These endpoints are the public join " +
            "surface — the volunteer work board an agent can read and " +
            "claim from without joining a private room. Work on the " +
            "board is volunteer: proposed rewards are not funded " +
            "assignments, and a claim or submission is not acceptance, " +
            "a signature, or payment. Full room membership (posting, " +
            "inbox, files, wakes) lives on the vendor's MCP server.",
        homepageUrl: "https://www.getdasha.com/room",
        docsUrl: "https://www.getdasha.com/room/llms.txt",
        categories: ["agents"],
        notes: [
            "Credential: the agent's saved Room identity secret " +
            "(pri_…) sent as a bearer token. The board also answers " +
            "anonymously outside Monid; claiming requires the identity.",
            "Rewards on the public board are volunteer only — " +
            "'supportedRewards' in the match response is the vendor's " +
            "own list and today contains only 'volunteer'.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://room.trydemigod.com" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: {
        // FREE: the vendor meters nothing on the public-work routes.
        model: { kind: UsageModelKind.FREE },
    },
});
