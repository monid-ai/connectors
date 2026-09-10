import { assert, assertEquals } from "@std/assert";
import type { EndpointDoc } from "@shared/core";
import {
    checkPricing,
    normalizeEventName,
    type Repin,
    selectPricing,
} from "./apify.ts";

/**
 * The D28 derived join: line ids were MINTED from apify's event names by
 * this transform, so the drift suite re-applies it to LIVE names at
 * check time. These cases pin every naming style the 46-actor fleet
 * actually publishes — a transform change that breaks any of them would
 * silently unjoin a rate check.
 */
Deno.test("normalizeEventName: the id-minting transform, verbatim", () => {
    const cases: Array<[string, string]> = [
        // apify- prefix strips
        ["apify-default-dataset-item", "default_dataset_item"],
        ["apify-actor-start", "actor_start"],
        // kebab → snake
        ["actor-start", "actor_start"],
        ["actor-start-gb", "actor_start_gb"],
        ["full-profile-with-email", "full_profile_with_email"],
        ["search-page", "search_page"],
        ["review-scraped", "review_scraped"],
        [
            "force-fresh-email-scrape-surcharge",
            "force_fresh_email_scrape_surcharge",
        ],
        // camelCase → snake (youtube-scraper)
        ["transcribeMinute", "transcribe_minute"],
        // already-snake names pass through
        ["item_returned", "item_returned"],
        // single words are their own ids
        ["request", "request"],
        ["review", "review"],
        ["start", "start"],
        ["spotlight", "spotlight"],
    ];
    for (const [event, id] of cases) {
        assertEquals(normalizeEventName(event), id, event);
    }
});

Deno.test("normalizeEventName: prefix strips only at the START", () => {
    // an event that merely CONTAINS "apify-" keeps it
    assertEquals(normalizeEventName("my-apify-thing"), "my_apify_thing");
});

// ---------------------------------------------------------------------------
// selectPricing (D29): pricingInfos is a HISTORY whose last entry can be
// a FUTURE scheduled pricing — never `infos[last]`
// ---------------------------------------------------------------------------

const NOW = "2026-09-09T00:00:00.000Z";

/** A Business-tier (GOLD) priced charge event, API-shaped. */
const gold = (price: number) => ({
    eventTieredPricingUsd: { GOLD: { tieredEventPriceUsd: price } },
});

/** The real eu-amazon pricingInfos shape (D29's motivating case): a
 *  regime change in the deep past, the pricing billing TODAY, and one
 *  FUTURE scheduled repricing as the LAST entry. */
const euAmazonHistory = (
    event: string,
    effectivePrice: number,
    scheduledPrice: number,
) => [
    {
        startedAt: "2025-05-01T00:00:00.000Z",
        pricingModel: "PRICE_PER_DATASET_ITEM",
    },
    {
        startedAt: "2026-06-01T00:00:00.000Z",
        pricingModel: "PAY_PER_EVENT",
        pricingPerEvent: {
            actorChargeEvents: { [event]: gold(effectivePrice) },
        },
    },
    {
        startedAt: "2026-09-17T00:00:00.000Z",
        pricingModel: "PAY_PER_EVENT",
        pricingPerEvent: {
            actorChargeEvents: { [event]: gold(scheduledPrice) },
        },
    },
];

Deno.test("selectPricing: effective = latest startedAt <= now; future entries land in upcoming", () => {
    const infos = euAmazonHistory("apify-default-dataset-item", 0.0069, 0.0079);
    const { effective, upcoming } = selectPricing(infos, NOW);
    // the MIDDLE entry bills today — the naive infos[last] would have
    // picked the scheduled 2026-09-17 pricing
    assertEquals(effective, infos[1]);
    assertEquals(upcoming, [infos[2]]);
});

Deno.test("selectPricing: an all-past history selects its last entry, upcoming empty", () => {
    const infos = euAmazonHistory("e", 0.001, 0.002).slice(0, 2);
    const { effective, upcoming } = selectPricing(infos, NOW);
    assertEquals(effective, infos[1]);
    assertEquals(upcoming, []);
});

// ---------------------------------------------------------------------------
// checkPricing (D29): scheduled-pin reconciliation + the coverage check
// ---------------------------------------------------------------------------

/** A minimal composite doc with ONE metered line whose id name-joins
 *  the canned `apify-default-dataset-item` event (the D28 derived
 *  join); checkPricing reads only id + usage.model. */
const compositeDoc = (amount: number): EndpointDoc =>
    ({
        id: "apify#test/actor",
        usage: {
            model: {
                kind: "COMPOSITE",
                components: {
                    default_dataset_item: {
                        kind: "PER_UNIT",
                        unit: "RESULT",
                        every: 1,
                        consumes: { credit: "default", amount },
                    },
                },
            },
        },
    }) as unknown as EndpointDoc;

const actorBody = (infos: unknown[]) => ({ data: { pricingInfos: infos } });

/** Run checkPricing over the canned eu-amazon-shaped history (effective
 *  0.0069, scheduled 0.0079 on 2026-09-17), collecting repins + log. */
function check(doc: EndpointDoc, extraEffectiveEvents = {}) {
    const infos = euAmazonHistory("apify-default-dataset-item", 0.0069, 0.0079);
    Object.assign(
        (infos[1].pricingPerEvent as {
            actorChargeEvents: Record<string, unknown>;
        }).actorChargeEvents,
        extraEffectiveEvents,
    );
    const repins: Repin[] = [];
    const log: string[] = [];
    const { findings } = checkPricing(
        doc,
        actorBody(infos),
        NOW,
        repins,
        (line) => log.push(line),
    );
    return { findings, repins, log };
}

Deno.test("checkPricing: pin == the EFFECTIVE price → no finding, no repin", () => {
    const { findings, repins } = check(compositeDoc(0.0069));
    assertEquals(findings, []);
    assertEquals(repins, []);
});

Deno.test("checkPricing: pin == an UPCOMING price → reconciled (repin carries effectiveAt), no finding", () => {
    // the pin is ahead of schedule — a known future change must not
    // break CI or force a flip-flop commit (D29)
    const { findings, repins, log } = check(compositeDoc(0.0079));
    assertEquals(findings, []);
    assertEquals(repins, [{
        docId: "apify#test/actor",
        line: "default_dataset_item",
        pinned: 0.0079,
        live: 0.0079,
        effectiveAt: "2026-09-17T00:00:00.000Z",
    }]);
    assert(log.some((line) => line.includes("UPCOMING")), log.join("\n"));
});

Deno.test("checkPricing: pin matches NEITHER effective nor scheduled → rate finding + repin", () => {
    const { findings, repins } = check(compositeDoc(0.005));
    assertEquals(findings.length, 1);
    assertEquals(findings[0].check, "rate");
    assertEquals(repins, [{
        docId: "apify#test/actor",
        line: "default_dataset_item",
        pinned: 0.005,
        live: 0.0069,
    }]);
});

Deno.test("checkPricing: a published event neither modeled nor EXCLUDED → coverage finding", () => {
    // the model pins its own line correctly, but the actor ALSO
    // publishes a "date-filter" charge nothing models — the D29
    // completeness guarantee must flag it, not shrug
    const { findings } = check(compositeDoc(0.0069), {
        "date-filter": gold(0.0007),
    });
    assertEquals(findings.length, 1);
    assertEquals(findings[0].check, "coverage");
    assert(
        findings[0].message.includes('"date-filter"'),
        findings[0].message,
    );
});

Deno.test("checkPricing: an event in the suite's EXCLUDED map → no finding", () => {
    // mirrors the real fleet: facebook-pages-scraper's "Page (Standby
    // API)" twin is a reviewed exclusion; the doc itself is a LEAF
    // whose single event joins by amount-existence
    const doc = {
        id: "apify#apify/facebook-pages-scraper",
        usage: {
            model: {
                kind: "PER_UNIT",
                unit: "RESULT",
                every: 1,
                consumes: { credit: "default", amount: 0.0054 },
            },
        },
    } as unknown as EndpointDoc;
    const infos = [{
        startedAt: "2026-06-01T00:00:00.000Z",
        pricingModel: "PAY_PER_EVENT",
        pricingPerEvent: {
            actorChargeEvents: {
                "apify-default-dataset-item": gold(0.0054),
                "page": gold(0.0054),
            },
        },
    }];
    const repins: Repin[] = [];
    const { findings } = checkPricing(
        doc,
        actorBody(infos),
        NOW,
        repins,
        () => {},
    );
    assertEquals(findings, []);
    assertEquals(repins, []);
});
