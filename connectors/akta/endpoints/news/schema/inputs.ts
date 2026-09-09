import { z } from "zod";
import {
    zCompany,
    zDate,
    zNewsScore,
    zSentiment,
} from "../../../schema/common.ts";

/** Akta /v1/news query params (ported from v1). List filters are ARRAYS in
 *  the schema; the provider-level toRequest renders them comma-separated. */
export const zNewsQueryParams = z.object({
    company: zCompany.optional(),
    query: z.string().min(1).optional().describe(
        "Open-ended topic to track a theme or commodity that doesn't map " +
            "to a specific company or industry (e.g. 'crude oil price " +
            "developments', 'FDA drug approval').",
    ),
    title: z.string().min(1).optional().describe(
        "Search articles whose title matches the text entered.",
    ),
    industry: z.array(z.string().min(1)).optional().describe(
        "Filter by industry code(s) from Akta's 30,000+ industry taxonomy. " +
            "Resolve a plain-text topic into codes via the Industry Search " +
            "endpoint (/v1/industry/search). Comma-separated on the wire.",
    ),
    start_date: zDate.optional().describe(
        "Start of the date range (YYYY-MM-DD). Non-enterprise plans are " +
            "limited to a 6-month lookback.",
    ),
    end_date: zDate.optional().describe(
        "End of the date range (YYYY-MM-DD). Defaults to today.",
    ),
    limit: z.number().int().min(1).max(1000).optional().describe(
        "Maximum number of articles to return. Default 10, max 1000.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of results to skip before returning records (pagination).",
    ),
    group_articles: z.boolean().optional().describe(
        "When true, groups similar articles from the same event.",
    ),
    news_score_list: z.array(zNewsScore).optional().describe(
        "Filter by news score tier. Accepted: High, Medium, Low, all. " +
            "Default all.",
    ),
    countries: z.array(z.string().min(1)).optional().describe(
        "Filter by the country of the event. ISO country codes, " +
            "comma-separated on the wire.",
    ),
    blacklisted: z.array(z.string().min(1)).optional().describe(
        "Publisher domains to exclude. Comma-separated on the wire.",
    ),
    type_list: z.array(z.string()).optional().describe(
        "Filter by news type code (see " +
            "https://playground.akta.pro/news-tags.csv). Default all.",
    ),
    sentiment_list: z.array(zSentiment).optional().describe(
        "Filter by sentiment. Accepted: positive, negative, neutral, all. " +
            "Default all.",
    ),
    entity_person_list: z.array(z.string().min(1)).optional().describe(
        "Filter by named people. Comma-separated on the wire.",
    ),
    entity_location_list: z.array(z.string().min(1)).optional().describe(
        "Filter by named locations. Comma-separated on the wire.",
    ),
    entity_product_list: z.array(z.string().min(1)).optional().describe(
        "Filter by named products. Comma-separated on the wire.",
    ),
    entity_event_list: z.array(z.string().min(1)).optional().describe(
        "Filter by named events. Comma-separated on the wire.",
    ),
    naics_code_list: z.array(z.string().min(1)).optional().describe(
        "Filter by NAICS codes. Comma-separated on the wire.",
    ),
    sic_code_list: z.array(z.string().min(1)).optional().describe(
        "Filter by SIC codes. Comma-separated on the wire.",
    ),
    iptc_code_list: z.array(z.string().min(1)).optional().describe(
        "Filter by IPTC codes. Comma-separated on the wire.",
    ),
    iab_code_list: z.array(z.string().min(1)).optional().describe(
        "Filter by IAB codes. Comma-separated on the wire.",
    ),
}).strict();
