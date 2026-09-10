import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeChannelBusinessEmailScraperBody } from "./schema/inputs.ts";
import { zYoutubeChannelBusinessEmailScraperOutput } from "./schema/output.ts";

/**
 * dataovercoffee/youtube-channel-business-email-scraper — Find YouTube Channel Emails. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find YouTube Channel Emails",
        summary: "Extract business emails from YouTube channels by URL, " +
            "handle, or channel ID.",
        description: "Extracts the business email a creator lists behind the " +
            "protected email gate on their YouTube channel About " +
            "page, from channel URLs, handles, or 24-character " +
            "channel IDs. Returns the business email address per " +
            "channel with channel name, channel ID, and extraction " +
            "status. Supports batches of up to 1,000 channels per " +
            "run and an optional forced fresh scrape of channels " +
            "seen before. Suited for creator outreach, influencer " +
            "marketing, and lead-generation pipelines keyed by " +
            "YouTube channel.",
        docsUrl:
            "https://apify.com/dataovercoffee/youtube-channel-business-email-scraper",
        categories: ["youtube"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/dataovercoffee/youtube-channel-business-email-scraper",
    request: {
        method: "POST",
        path:
            "/v2/acts/dataovercoffee~youtube-channel-business-email-scraper/runs",
    },
    input: {
        schema: {
            // scrape_fresh_emails is the surcharge GATE the estimate
            // reads — optional on the actor with a verified published
            // server default (false), materialized at the binding (D25).
            body: zYoutubeChannelBusinessEmailScraperBody.extend({
                scrape_fresh_emails: zYoutubeChannelBusinessEmailScraperBody
                    .shape.scrape_fresh_emails.unwrap().default(false),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zYoutubeChannelBusinessEmailScraperOutput },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): emails plus the force-fresh surcharge
         *  the scrape_fresh_emails input switches on ($0.28 on top of
         *  the base $0.12 — $0.40 total per result, the actor's own
         *  input description). Ids normalize from the actor's event
         *  names (D28); Business-tier rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "emails",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.12 },
                },
                force_fresh_email_scrape_surcharge: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "force-fresh surcharge",
                    description: "surcharge per email when " +
                        "scrape_fresh_emails forces a fresh scrape " +
                        "directly from YouTube",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.28 },
                },
            },
        },
        /** one channel record per entry (v1 ONE_PER_QUERY) — channels is
         *  non-empty by the actor's own minItems (mirrored in the schema),
         *  so the estimate is pure arithmetic (D24). The surcharge line
         *  is PROMISED at the same per-channel cap when its gate
         *  (scrape_fresh_emails, binding default false) switches it
         *  on — it applies per result. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    default_dataset_item: body.channels.length,
                    ...(body.scrape_fresh_emails
                        ? {
                            force_fresh_email_scrape_surcharge:
                                body.channels.length,
                        }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the emails; the surcharge applies to each of them
         *  when the force-fresh gate was on (per result — the actor's
         *  own input description). The D27 claim (usageTotalUsd) stays
         *  the credits truth. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            const fresh = utils.json.optionalGet(
                data.input.body ?? {},
                "$.scrape_fresh_emails",
            ) === true;
            return {
                counts: {
                    default_dataset_item: items,
                    ...(fresh
                        ? { force_fresh_email_scrape_surcharge: items }
                        : {}),
                },
            };
        },
    },
});
