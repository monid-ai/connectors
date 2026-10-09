import { z } from "zod";
import { zDate, zStringList } from "../../../schema/common.ts";

/** POST /news_articles/search query params — the vendor mirror
 *  (docs.apollo.io/reference/news-articles-search, 2026-09-16).
 *  `organization_ids[]` is the one filter Apollo requires. */
export const zNewsArticlesSearchQueryParams = z.object({
    "organization_ids[]": zStringList.min(1).describe(
        "Apollo organization ids whose news to search (from Organization " +
            "Search).",
    ),
    "categories[]": zStringList.describe(
        "News categories or sub-categories to include, e.g. 'hires', " +
            "'investment', 'contract'.",
    ).optional(),
    "published_at[min]": zDate.describe(
        "Earliest publish date (YYYY-MM-DD).",
    ).optional(),
    "published_at[max]": zDate.describe(
        "Latest publish date (YYYY-MM-DD).",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page of articles to retrieve (1-based).",
    ).optional(),
    // "up to 25 results per page" — the pricing page's per-page bound
    per_page: z.number().int().min(1).max(25).describe(
        "Articles per page (at most 25).",
    ).optional(),
}).strict();
