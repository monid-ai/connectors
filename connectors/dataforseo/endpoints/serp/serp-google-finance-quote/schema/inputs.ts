import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/finance_quote/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleFinanceQuoteBody = z.object({
    keyword: z.string().min(1).max(200).describe(
        "Ticker with exchange, e.g. 'AAPL:NASDAQ', or a pair such as 'EUR-USD'.",
    ),
    ...zLocaleFields,
    device: z.string().min(1).describe("Device type").optional(),
    os: z.string().min(1).describe(
        "Device operating system (values: windows)",
    ).optional(),
    window: z.string().min(1).describe(
        "Time window for google_finance_quote graph (default 1D; values: 1D, 5D, 1M, 6M, YTD, 1Y, 5Y, MAX)",
    ).optional(),
}).strict();
