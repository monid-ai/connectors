import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { findEndpointDir, REPO_ROOT } from "./lib.ts";

Deno.test("CLI repository root is a native filesystem path, including spaces", async () => {
    const expected = fromFileUrl(new URL("../", import.meta.url));
    assertEquals(REPO_ROOT, expected);
    assertEquals((await Deno.stat(join(REPO_ROOT, "deno.json"))).isFile, true);
});

Deno.test("findEndpointDir resolves a grouped endpoint by its source folder name", async () => {
    const source = new URL(
        "../connectors/apify/endpoints/google/google-maps-scraper/endpoint.ts",
        import.meta.url,
    );
    assertEquals(
        await findEndpointDir("apify", "google-maps-scraper"),
        dirname(fromFileUrl(source)),
    );
});

Deno.test("findEndpointDir still resolves a native request path", async () => {
    const source = new URL(
        "../connectors/firecrawl/endpoints/scrape/endpoint.ts",
        import.meta.url,
    );
    assertEquals(
        await findEndpointDir("firecrawl", "scrape"),
        dirname(fromFileUrl(source)),
    );
});
