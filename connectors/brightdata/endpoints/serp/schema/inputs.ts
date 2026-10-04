import { z } from "zod";
import { zBrightdataRequestBody } from "../../../schema/request-body.ts";

/**
 * SERP API request body. Bright Data publishes the SAME `PostBody` for SERP
 * API as for Web Unlocker API minus `render` and `debug`, which is exactly
 * the shared mirror — so this schema is the shared one with a `url`
 * description that carries the part an agent cannot guess: WHICH url, and
 * the `brd_json` switch that turns markup into fields (design D2).
 */
export const zBrightdataSerpBody = zBrightdataRequestBody.extend({
    url: z.string().min(1).describe(
        "A search ENGINE url, not a page to scrape — the query belongs in " +
            "it: `https://www.google.com/search?q=pizza`. Google, Bing, " +
            "Yandex and DuckDuckGo are supported. Append `brd_json=1` to " +
            "get the results page as parsed JSON instead of HTML. The " +
            "engine's own parameters work as documented by the engine — " +
            "`hl` and `gl` for language and geo, `num` for result count, " +
            "`start` for the page offset, `tbm=isch|nws|shop` for images, " +
            "news and shopping — and Bright Data adds its own `brd_*` " +
            "switches on top (`brd_ai_overview=2` to force an AI Overview " +
            "block).",
    ),
});
