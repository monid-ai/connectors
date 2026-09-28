import { defineProvider, presets } from "@shared/core";

/**
 * GetXAPI (getxapi.com): read access to public X (Twitter) data as JSON.
 *
 * Every endpoint here is a synchronous GET against
 * `https://api.getxapi.com/twitter/...` with one Bearer key, so this is the
 * litescrape shape: the provider owns auth, the base URL, the error digest
 * and the credit pool, and each endpoint declares only its path, its query
 * mirror and its flat price.
 *
 * SCOPE: the public reads only. GetXAPI also sells write actions (post,
 * like, follow, DMs, bookmarks, articles) that act as a real X account and
 * take that account's session token on every call. They are deliberately
 * left out: a broker should not carry end-user X sessions.
 *
 * BILLING (design D26): GetXAPI prices every endpoint in US dollars per
 * call, and a response carries no meter, so there is no `consolidate` and
 * each endpoint's model is a flat `PER_CALL` line in dollars. Rates are
 * the published per-endpoint prices on https://www.getxapi.com/pricing and
 * in each operation's description in the public OpenAPI 3.1 spec
 * (https://docs.getxapi.com/openapi.json), read 2026-09-23: $0.001 per
 * call, except `tweet/thread` at $0.005 and `user/tweets/complete` at
 * $0.003. A non-2xx (400 bad input, 401, 402 out of credit, 404 not found,
 * 429, 5xx) is not billed by the vendor, and the engine settles it at zero.
 *
 * OUTPUT: the vendor's body is relayed verbatim, `next_cursor` included, so
 * paging is the caller's: pass `next_cursor` back as `cursor`. No
 * `fromResponse`.
 */
export default defineProvider({
    name: "getxapi",
    meta: {
        displayName: "GetXAPI",
        summary:
            "Public X (Twitter) data as JSON: tweets, profiles, followers, " +
            "search, and trends.",
        description:
            "Read public X (Twitter) data without an X developer account. " +
            "Search tweets with X's full advanced-search operator syntax; " +
            "read a tweet, its replies, its reposters, or a whole " +
            "self-thread; look up a profile by username or numeric id, " +
            "check whether an account is live or suspended, and read its " +
            "about page with username history; page through followers, " +
            "following, verified followers, and an organization's " +
            "affiliates; read a user's tweets, replies, media, and mentions; " +
            "list members, community details, Space metadata, and live " +
            "trends for about 470 locations. One flat price per call, from " +
            "$0.001, and about 20 items per page on most list endpoints.",
        homepageUrl: "https://www.getxapi.com",
        docsUrl: "https://docs.getxapi.com/docs",
        categories: ["twitter"],
        notes: [
            "Every list endpoint pages with an opaque cursor: pass the " +
            "response's `next_cursor` back as `cursor` while `has_more` is " +
            "true. Each page is a separate billed call.",

            "Usernames are sent without the leading @. Ids (tweet, user, " +
            "list, community) are numeric strings; keep them as strings, " +
            "because X ids are 64-bit and lose precision as JSON numbers.",

            "Every HTTP 200 is billed at the endpoint's flat price, " +
            "including a page with no items. Every non-2xx (400 missing or " +
            "bad parameter, 401 bad key, 402 no credit, 404 account or " +
            "tweet not found, protected or suspended, 429, 5xx) is not " +
            "billed and settles at zero.",

            "Public data only: protected accounts, private lists, and " +
            "anything that needs a signed-in X account are out of scope and " +
            "answer 404.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    // The `/twitter` prefix rides the base URL, so the compiled id is the
    // vendor's own path under it: `getxapi#tweet/advanced_search`.
    request: { baseUrl: "https://api.getxapi.com/twitter" },
    // Most reads answer in 1-3 s; a 200-user followers page or a thread
    // expansion takes longer, so the engine's default budget is kept.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    output: {
        /** GetXAPI's error body is `{ error, hint? }`: lift the message to
         *  the top and keep the raw body beside it. Runs only on provider
         *  errors, after the engine has forced zero usage. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "GetXAPI error",
                raw: data.output,
            };
        },
    },
    usage: {
        /** THE credit system (design D26): a dollar-priced vendor's pool is
         *  dollars. One pool, so id `default`. */
        credits: { default: { label: "US dollars" } },
    },
});
