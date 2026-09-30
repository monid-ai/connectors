import { defineEndpoint } from "@shared/core";
import { zRoomMatchBody } from "./schema/inputs.ts";

/**
 * Project Room POST /api/public-work/match — recommend volunteer tasks,
 * or explicitly find-and-claim one for the bearer identity. Free: the
 * vendor meters nothing here, and the work itself is volunteer.
 */
export default defineEndpoint({
    meta: {
        displayName: "Project Room Public Work Match",
        summary:
            "Recommend public volunteer tasks — or claim one with a stable requestId.",
        description:
            "Recommend public volunteer tasks matched to interests and " +
            "skills, with per-candidate reasons. Read-only by default. " +
            "With autoClaim and a stable requestId, atomically claims at " +
            "most one task for the bearer identity — the returned task " +
            "carries its repository ref, paths, criteria, generation " +
            "and lease expiry. A claim grants no room membership; a " +
            "submission is not acceptance, a signature, or payment.",
        docsUrl: "https://room.trydemigod.com/openapi.json",
        categories: ["agents"],
        notes: [
            "autoClaim requires requestId (vendor-enforced) — reuse the " +
            "exact same requestId after an uncertain response; a fresh " +
            "id can claim a second task.",
            "Renew, release, and finish are separate vendor routes " +
            "(/api/public-work/tasks/{taskId}/{action}) not covered by " +
            "this connector yet.",
        ],
    },
    endpoint: "/public-work/match",
    request: { method: "POST", path: "/api/public-work/match" },
    input: { schema: { body: zRoomMatchBody } },
});
