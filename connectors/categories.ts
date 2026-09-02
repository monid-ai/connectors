import { defineLeafCategories } from "@shared/core";

/**
 * LEAF category registry — the CLOSED vocabulary for `meta.categories`.
 *
 * Endpoints author ONLY these ids; an unknown id fails compilation. Adding a
 * leaf = editing this file in the same PR as the endpoint that needs it.
 *
 * This is the whole taxonomy story in this repo (v1 round-4 model): TOP groups
 * ("Search & SEO"), provider placement, and visibility are HOSTED concerns —
 * the Catalog manifest links leaves under tops at query time; the provider
 * tier is derived from ProviderDocs. Never authored here.
 */
export const LEAF_CATEGORIES = defineLeafCategories([
    {
        id: "web-search",
        displayName: "Web Search",
        description:
            "Search the open web — keyword, neural, and hybrid retrieval.",
    },
    {
        id: "web-scraping",
        displayName: "Web Scraping",
        description: "Fetch and extract clean content from known URLs.",
    },
    {
        id: "news-search",
        displayName: "News Search",
        description: "Search and monitor news coverage.",
    },
    {
        id: "company-enrichment",
        displayName: "Company Enrichment",
        description:
            "Company data: identity resolution, firmographics, and enrichment.",
    },
    {
        id: "company-news",
        displayName: "Company News",
        description:
            "Company event signals — funding, M&A, leadership, products.",
    },
    {
        id: "company-reviews",
        displayName: "Company Reviews",
        description: "Employee and product review data for companies.",
    },
    {
        id: "funding-data",
        displayName: "Funding Data",
        description: "Fundraising, investors, valuations, and deal activity.",
    },
    {
        id: "embeddings",
        displayName: "Embeddings",
        description: "Convert text and media into vector representations.",
    },
]);
