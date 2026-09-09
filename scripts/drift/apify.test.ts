import { assertEquals } from "@std/assert";
import { normalizeEventName } from "./apify.ts";

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
