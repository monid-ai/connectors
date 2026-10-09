import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));

/**
 * MrScraper's draw per endpoint — the vendor's marketplace catalog
 * (`pricePerRun` per card at https://app.mrscraper.com/marketplace, behind
 * login, dumped by v1 on 2026-09-07) corrected by v1's 2026-09-08
 * drills for the marketplace scrapers, and the playground's variable meter
 * (`token_usage`) as each happy fixture reports it. The vendor's echo
 * equals the fold on every happy chain, so no `mismatch` key appears
 * (zUsage is strict; deep-equality proves it). Written as LITERALS on
 * purpose (clay D7a): deriving them from each doc's own model would make
 * this test a tautology. A new endpoint must state its row here.
 */
const RATE: Record<
    string,
    { input: RunInput; usage: Record<string, unknown> }
> = {
    "mrscraper#scrape/html": {
        input: { body: { url: "https://example.com" } },
        usage: { credits: { default: 2 }, evidence: { TOKEN: 2 } },
    },
    "mrscraper#scrape/markdown": {
        input: { body: { url: "https://example.com" } },
        usage: { credits: { default: 2 }, evidence: { TOKEN: 2 } },
    },
    "mrscraper#scrape/screenshot": {
        input: { body: { url: "https://example.com" } },
        usage: { credits: { default: 3 }, evidence: { TOKEN: 3 } },
    },
    "mrscraper#scrape/extract": {
        input: {
            body: {
                url: "https://example.com",
                prompt: "Extract the page title.",
            },
        },
        usage: { credits: { default: 12 }, evidence: { TOKEN: 12 } },
    },
    "mrscraper#scrape/detail": {
        input: { body: { url: "https://example.com" } },
        usage: { credits: { default: 32 }, evidence: { TOKEN: 32 } },
    },
    "mrscraper#scrape/listing": {
        input: { body: { url: "https://books.toscrape.com/", maxPages: 2 } },
        usage: { credits: { default: 45 }, evidence: { TOKEN: 45 } },
    },
    "mrscraper#scrape/map": {
        input: { body: { url: "https://quotes.toscrape.com/", maxPages: 2 } },
        usage: { credits: { default: 30 }, evidence: { TOKEN: 30 } },
    },
    "mrscraper#serp/google": {
        input: { body: { query: "mrscraper", region: "us" } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#gemini/ask": {
        input: { body: { query: "What is MrScraper?" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#google/ai-mode": {
        input: { body: { keyword: "best web scraping api", country: "us" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#gpt/web-search": {
        input: { body: { query: "What is MrScraper?" } },
        usage: { credits: { default: 25 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#google/flights": {
        input: {
            body: {
                origin: "JFK",
                destination: "SIN",
                type: "OW",
                date: "2026-11-20",
                country: "us",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#google/hotel": {
        input: {
            body: {
                url: "https://www.google.com/travel/hotels/entity/ChUI17vV0u_fprYCGgkvbS8wZGQ5MDMQAQ",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/hashtag": {
        input: { body: { tag: "lego" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/video-download": {
        input: {
            body: {
                url: "https://www.tiktok.com/@sgweekender/video/7636779258941066504",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/video": {
        input: {
            body: {
                url: "https://www.tiktok.com/@mrbeast/video/7670199761282075935",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#youtube/comments": {
        input: { body: { videoId: "HeyIXwZyR8Y" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#youtube/video": {
        input: { body: { url: "https://www.youtube.com/watch?v=HeyIXwZyR8Y" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#1688/category": {
        input: {
            body: {
                "url":
                    "https://s.1688.com/selloffer/offer_search.htm?keywords=phone",
            },
        },
        usage: { credits: { default: 29 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#amazon/product": {
        input: { body: { "url": "https://www.amazon.com/dp/B0CP9YB3Q4" } },
        usage: { credits: { default: 50 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#autozone/category": {
        input: {
            body: {
                "url":
                    "https://www.autozone.com/batteries-starting-and-charging/battery",
            },
        },
        usage: { credits: { default: 12 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#cvs/product": {
        input: {
            body: {
                "url":
                    "https://www.cvs.com/shop/one-other-hand-mask-prodid-633763",
                "zipCode": "02108",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#homedepot/product": {
        input: {
            body: {
                "url": "https://www.homedepot.com/p/LG-Refrigerator/12345",
                "zipCode": "30301",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#kroger/product": {
        input: {
            body: {
                "url": "https://www.kroger.com/p/chicken-breasts/0027061550000",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#lazada/category": {
        input: { body: { "url": "https://www.lazada.sg/catalog/?q=earbuds" } },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#lazada/product": {
        input: {
            body: {
                "url":
                    "https://www.lazada.sg/products/pdp-i3158507329-s22328619522.html",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#meijer/product": {
        input: {
            body: {
                "url":
                    "https://www.meijer.com/shopping/product/highlighters-4pk/71928356637.html",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#nordstrom/product": {
        input: {
            body: {
                "url":
                    "https://www.nordstrom.com/s/ultra-soft-zip-jacket/8036333",
            },
        },
        usage: { credits: { default: 93 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#segari/product": {
        input: {
            body: { "url": "https://segari.id/p/telur-ayam-kampung-curah" },
        },
        usage: { credits: { default: 24 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#shein/product": {
        input: { body: { "url": "https://us.shein.com/--p-98911792.html" } },
        usage: { credits: { default: 30 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/catalog": {
        input: {
            body: {
                "url":
                    "https://www.tiktok.com/shop/sg/c/cases-screen-protectors/601925",
            },
        },
        usage: { credits: { default: 36 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/product": {
        input: {
            body: {
                "url": "https://www.tiktok.com/shop/pdp/1731949430853767209",
            },
        },
        usage: { credits: { default: 12 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiktok/search": {
        input: { body: { "query": "wireless earbuds" } },
        usage: { credits: { default: 20 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#walmart/product": {
        input: {
            body: {
                "url": "https://www.walmart.com/ip/HP-14-Laptop/17581855155",
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#watsons/category": {
        input: {
            body: {
                "url":
                    "https://www.watsons.com.my/health-care/vitamins-minerals/c/110100",
            },
        },
        usage: { credits: { default: 21 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#agoda/hotel": {
        input: {
            body: {
                "hotelId": 3126,
                "checkIn": "2026-10-14",
                "checkOut": "2026-10-16",
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "currency": "USD",
                "locale": "en-US",
                "login": 1,
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#agoda/rates": {
        input: {
            body: {
                "url":
                    "https://www.agoda.com/ad-lib-bangkok/hotel/bangkok-th.html?checkIn=2026-10-14&los=1&adults=2",
            },
        },
        usage: { credits: { default: 46 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#agoda/reviews": {
        input: {
            body: {
                "url":
                    "https://www.agoda.com/admiral-suites/hotel/bangkok-th.html",
            },
        },
        usage: { credits: { default: 41 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#booking/rates": {
        input: {
            body: {
                "url":
                    "https://www.booking.com/hotel/th/admiral.html?checkin=2026-10-14&checkout=2026-10-16",
            },
        },
        usage: { credits: { default: 41 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#booking/reviews": {
        input: {
            body: { "url": "https://www.booking.com/hotel/th/admiral.html" },
        },
        usage: { credits: { default: 36 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#china-southern/flights": {
        input: {
            body: {
                "origin": "BKK",
                "dest": "CGK",
                "adult": 1,
                "child": 0,
                "infant": 0,
                "dptDate": "2026-11-05",
                "fareClass": "economy",
                "locale": "en-US",
                "currency": "USD",
            },
        },
        usage: { credits: { default: 2 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#expedia/rates": {
        input: {
            body: {
                "url":
                    "https://www.expedia.com/Bangkok-Hotels-Admiral-Suites.h1234567.Hotel-Information?chkin=2026-10-14&chkout=2026-10-16",
            },
        },
        usage: { credits: { default: 31 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#expedia/search": {
        input: {
            body: {
                "url":
                    "https://www.expedia.com/Hotel-Search?destination=Bangkok&startDate=2026-10-14&endDate=2026-10-16",
            },
        },
        usage: { credits: { default: 26 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#hotels-com/reviews": {
        input: {
            body: {
                "url": "https://th.hotels.com/en/ho338863/mitsui-garden-hotel/",
            },
        },
        usage: { credits: { default: 24 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tiket/hotel": {
        input: {
            body: {
                "hotelId": "the-example-jakarta",
                "checkIn": "2026-10-14",
                "checkOut": "2026-10-16",
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "currency": "IDR",
                "locale": "id-ID",
                "login": 1,
            },
        },
        usage: { credits: { default: 10 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#trip/hotel": {
        input: {
            body: {
                "hotelId": "992573",
                "checkIn": "2026-10-14",
                "checkOut": "2026-10-16",
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "currency": "USD",
                "locale": "en-US",
                "login": 1,
            },
        },
        usage: { credits: { default: 20 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#trip/rates": {
        input: {
            body: {
                "url":
                    "https://us.trip.com/hotels/shanghai-hotel-detail-992573/?checkin=2026-10-14&checkout=2026-10-16",
            },
        },
        usage: { credits: { default: 30 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#trip/reviews": {
        input: {
            body: {
                "url":
                    "https://us.trip.com/hotels/shanghai-hotel-detail-992573/",
            },
        },
        usage: { credits: { default: 31 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#tripadvisor/reviews": {
        input: {
            body: {
                "url":
                    "https://www.tripadvisor.com/Hotel_Review-g293916-d308699",
            },
        },
        usage: { credits: { default: 20 }, evidence: { RESULT: 1 } },
    },
    "mrscraper#zepto/product": {
        input: {
            body: {
                "url":
                    "https://www.zepto.com/pn/lizol-floor-cleaner/pvid/de4cf5f8-e81e-41d3-aebc-44d019fa5f35",
                "pincode": "560001",
            },
        },
        usage: { credits: { default: 9 }, evidence: { RESULT: 1 } },
    },
};

/** Fixture dir: `endpoints/<v1 id, slashes as dashes>/fixtures/`. */
const happyFixture = (id: string) =>
    loadFixture(
        `${HERE}endpoints/${
            id.split("#")[1].replaceAll("/", "-")
        }/fixtures/synthetic-happy.json`,
    );

const mrscraperIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("mrscraper#"))
        .sort();
};

Deno.test("mrscraper: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await mrscraperIds();
    assertEquals(ids.length, 50);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("mrscraper: every endpoint's happy run settles its published draw and drops the meter", async () => {
    for (const [id, { input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const fixture = await happyFixture(id);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        const output = result.output as Record<string, Json>;
        assertEquals("tokenUsage" in output, false, id);
        assertEquals("token_usage" in output, false, id);
    }
});

Deno.test("mrscraper: empty results and soft failures record zero whatever the vendor reports (design D4)", async () => {
    const id = "mrscraper#serp/google";
    const unit = await testSealedUnit(id);
    const cases: [string, Json][] = [
        ["no data key", { success: true, message: "ok", tokenUsage: 1 }],
        ["null data", { success: true, data: null, tokenUsage: 1 }],
        ["empty object", { success: true, data: {}, tokenUsage: 1 }],
        ["empty array", { success: true, data: [], tokenUsage: 1 }],
        ["success false", { success: false, data: { x: 1 }, tokenUsage: 1 }],
        ["soft failure", {
            success: true,
            data: { status: "FAIL" },
            tokenUsage: 1,
        }],
    ];
    for (const [label, body] of cases) {
        const fixture = await happyFixture(id);
        fixture.calls[0].res.body = body;
        const result = await runEndpoint({
            unit,
            input: RATE[id].input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, label);
        assertEquals(
            result.usage,
            { credits: {}, evidence: { RESULT: 0 } },
            label,
        );
    }
});

Deno.test("mrscraper: a marketplace run billed above the card settles the vendor's count with a cross-check", async () => {
    const id = "mrscraper#serp/google";
    const unit = await testSealedUnit(id);
    const fixture = await happyFixture(id);
    (fixture.calls[0].res.body as { tokenUsage: number }).tokenUsage = 3;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 1 },
        mismatch: { derived: { default: 1 } },
    });
});

Deno.test("mrscraper: an envelope without the meter settles the card", async () => {
    const id = "mrscraper#serp/google";
    const unit = await testSealedUnit(id);
    const fixture = await happyFixture(id);
    delete (fixture.calls[0].res.body as Record<string, Json>).tokenUsage;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
});

Deno.test("mrscraper: usage fn provenance — the marketplace majority inherits, the playground overrides", async () => {
    const bundle = await testBundle();
    const ids = await mrscraperIds();
    const playground = ids.filter((id) => id.startsWith("mrscraper#scrape/"));
    const marketplace = ids.filter((id) => !id.startsWith("mrscraper#scrape/"));
    assertEquals(playground.length, 7);
    const serp = bundle.endpoints["mrscraper#serp/google"];
    // the three review scrapers override evidence + consolidate with the
    // empty-`reviews[]` basis (design D12) — one interned text each
    const reviews = [
        "mrscraper#agoda/reviews",
        "mrscraper#trip/reviews",
        "mrscraper#tripadvisor/reviews",
    ];
    for (const id of marketplace) {
        const doc = bundle.endpoints[id];
        // one Bearer inject, one envelope consolidate, one generic
        // evidence, one unwrap — all the provider's
        assertEquals(doc.auth.inject.$fn.key, serp.auth.inject.$fn.key, id);
        const own = reviews.includes(id);
        assertEquals(
            doc.usage.consolidate?.$fn.key === serp.usage.consolidate?.$fn.key,
            !own,
            id,
        );
        assertEquals(
            doc.usage.evidence.$fn.key === serp.usage.evidence.$fn.key,
            !own,
            id,
        );
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            serp.output.fromResponse?.$fn.key,
            id,
        );
        // TripAdvisor rides the vendor-designated TVLK host (design D12)
        assertEquals(
            doc.request.url.startsWith(
                id === "mrscraper#tripadvisor/reviews"
                    ? "https://tvlk.mrscraper.com/"
                    : "https://sync.scraper.mrscraper.com/",
            ),
            true,
            id,
        );
    }
    const agoda = bundle.endpoints["mrscraper#agoda/reviews"];
    for (const id of reviews) {
        const doc = bundle.endpoints[id];
        assertEquals(
            doc.usage.evidence.$fn.key,
            agoda.usage.evidence.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            agoda.usage.consolidate?.$fn.key,
            id,
        );
    }
    // the SERP is the one marketplace doc with a toRequest (format: json)
    assertEquals(
        marketplace.filter((id) =>
            bundle.endpoints[id].input.toRequest !== undefined
        ),
        ["mrscraper#serp/google"],
    );
    const html = bundle.endpoints["mrscraper#scrape/html"];
    for (const id of playground) {
        const doc = bundle.endpoints[id];
        // the playground's own host, header auth, meter and strip —
        // interned across the seven (same text)
        assertEquals(doc.request.url, "https://api.mrscraper.com/", id);
        assertEquals(doc.auth.inject.$fn.key, html.auth.inject.$fn.key, id);
        assertEquals(
            doc.auth.inject.$fn.key !== serp.auth.inject.$fn.key,
            true,
            id,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            html.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.evidence.$fn.key,
            html.usage.evidence.$fn.key,
            id,
        );
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            html.output.fromResponse?.$fn.key,
            id,
        );
        assertEquals(doc.input.toRequest !== undefined, true, id);
        assertEquals(doc.timeouts, { requestMs: 330_000, runMs: 330_000 }, id);
    }
    // every playground preset states its own flags: seven toRequest texts
    assertEquals(
        new Set(
            playground.map((id) =>
                bundle.endpoints[id].input.toRequest?.$fn.key
            ),
        ).size,
        7,
    );
});
