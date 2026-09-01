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
]);
