import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zProfileReadPathParams } from "./schema/inputs.ts";

/**
 * `GET /v3/enrich/{profile_id}` — read the profile Orbit holds, as it stands.
 *
 * PUBLIC IDENTITY IS DECLARED (design D22). The vendor path is shared with
 * `POST /v3/enrich/{profile_id}`, which starts work; two defs on one path
 * collide, so the read takes its own name and the write keeps the native
 * path.
 *
 * Priced at Orbit's profile-read rate, and settled on the receipt the
 * response carries. Reading does no work: it returns what is stored, at
 * whatever depth it was last built to.
 */
export default defineEndpoint({
    meta: {
        displayName: "Read Person Profile",
        summary: "Read the deepest context Orbit holds about one person.",
        description: "Read one person's Orbit profile as it stands — " +
            "identity and contact fields, their work and education history, " +
            "images, source links, and generated sections covering their " +
            "background, interests, and recent activity, each claim " +
            "attributed to the source behind it. Takes an Orbit profile id, " +
            "an alias id, or a public slug — search results and enrichment " +
            "responses all carry one. The response reports " +
            "`generation_level`, which says how deep the stored profile " +
            "goes; `orbit#v3/enrich/{profile_id}` builds it deeper. The " +
            "read returns the profile as stored, and can schedule a " +
            "refresh behind it when that data is stale. This is " +
            "the endpoint to reach for when an agent already knows WHO the " +
            "person is and wants everything about them — briefing before a " +
            "call, personalizing outreach, or answering the user about " +
            "someone they just named. Priced at Orbit's profile-read rate.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich/read-profile",
        categories: ["people-enrichment"],
    },
    endpoint: "/v3/profile/{profile_id}",
    request: { method: "GET", path: "/v3/enrich/{profile_id}" },
    input: { schema: { pathParams: zProfileReadPathParams } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    usage: {
        /** Metered in Orbit's own credits; the provider's evidence reads the
         *  receipt. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profile read",
            description: "Orbit's profile-read rate, as its receipt reports it",
        },
        /** One read at the published profile-read rate (card 2026-09-17). */
        estimate: () => ({ counts: { CREDIT: 1 } }),
    },
});
