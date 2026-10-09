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
    {
        id: "people-enrichment",
        displayName: "People Enrichment",
        description:
            "Person data: profiles, contact discovery, and enrichment.",
    },
    {
        id: "linkedin",
        displayName: "LinkedIn",
        description: "LinkedIn data: profiles, jobs, posts, and companies.",
    },
    {
        id: "instagram",
        displayName: "Instagram",
        description: "Instagram data: profiles, posts, and hashtags.",
    },
    {
        id: "twitter",
        displayName: "X (Twitter)",
        description: "X (Twitter) data: tweets, profiles, and searches.",
    },
    {
        id: "youtube",
        displayName: "YouTube",
        description:
            "YouTube data: videos, transcripts, comments, and channels.",
    },
    {
        id: "maps",
        displayName: "Maps & Local",
        description:
            "Maps and local-places data: businesses, reviews, and points of interest.",
    },
    {
        id: "amazon",
        displayName: "Amazon",
        description:
            "Amazon data: products, reviews, search results, and sellers.",
    },
    {
        id: "facebook",
        displayName: "Facebook",
        description:
            "Facebook data: pages, groups, events, ads, posts, and reviews.",
    },
    {
        id: "google-shopping",
        displayName: "Google Shopping",
        description: "Google Shopping data: products, prices, and sellers.",
    },
    {
        id: "tiktok-shop",
        displayName: "TikTok Shop",
        description: "TikTok Shop data: products, reviews, and sellers.",
    },
    {
        id: "1688",
        displayName: "1688",
        description: "1688 data: wholesale listings, offers, and prices.",
    },
    {
        id: "autozone",
        displayName: "AutoZone",
        description:
            "AutoZone data: products, category listings, and vehicle fitment.",
    },
    {
        id: "cvs",
        displayName: "CVS",
        description: "CVS data: products, prices, and availability.",
    },
    {
        id: "homedepot",
        displayName: "Home Depot",
        description: "Home Depot data: products, prices, and specifications.",
    },
    {
        id: "kroger",
        displayName: "Kroger",
        description: "Kroger data: products, prices, and availability.",
    },
    {
        id: "lazada",
        displayName: "Lazada",
        description: "Lazada data: products, category listings, and prices.",
    },
    {
        id: "meijer",
        displayName: "Meijer",
        description: "Meijer data: products, prices, and availability.",
    },
    {
        id: "nordstrom",
        displayName: "Nordstrom",
        description: "Nordstrom data: products, category listings, and prices.",
    },
    {
        id: "segari",
        displayName: "Segari",
        description: "Segari data: products, prices, and availability.",
    },
    {
        id: "shein",
        displayName: "Shein",
        description: "Shein data: products, prices, and variants.",
    },
    {
        id: "walmart",
        displayName: "Walmart",
        description: "Walmart data: products, reviews, and prices.",
    },
    {
        id: "watsons",
        displayName: "Watsons",
        description: "Watsons data: products, category listings, and prices.",
    },
    {
        id: "zepto",
        displayName: "Zepto",
        description: "Zepto data: products, prices, and availability.",
    },
    {
        id: "ai-search",
        displayName: "AI Search",
        description:
            "AI search engines: Gemini, ChatGPT web search, Google AI Mode.",
    },
    {
        id: "flights",
        displayName: "Flights",
        description: "Flight data: fares, schedules, and routes.",
    },
    {
        id: "hotels",
        displayName: "Hotels",
        description: "Hotel data: room rates, availability, and guest reviews.",
    },
    {
        id: "jobs",
        displayName: "Jobs",
        description: "Job listings and hiring data.",
    },
    {
        id: "reddit",
        displayName: "Reddit",
        description: "Reddit data: posts, comments, and communities.",
    },
    {
        id: "snapchat",
        displayName: "Snapchat",
        description: "Snapchat data: profiles, stories, and spotlight videos.",
    },
    {
        id: "tiktok",
        displayName: "TikTok",
        description:
            "TikTok data: videos, profiles, comments, and search results.",
    },
    {
        id: "agents",
        displayName: "Agents",
        description:
            "Hosted multi-step research agents that plan, search, and synthesize.",
    },
    {
        // The GENERATIVE leaves: every other id above names data that
        // already exists somewhere and is retrieved. These name an artifact
        // the call creates.
        id: "video-generation",
        displayName: "Video Generation",
        description:
            "Generate video from a text prompt, a still image, or reference " +
            "clips.",
    },
    {
        id: "3d-generation",
        displayName: "3D Generation",
        description:
            "Generate production 3D meshes from text prompts and photos.",
    },
    {
        id: "image-generation",
        displayName: "Image Generation",
        description:
            "Generate images, including text-to-image, editing, and more.",
    },
    {
        id: "music-generation",
        displayName: "Music Generation",
        description:
            "Generate music, including full tracks from natural language, and more.",
    },
    {
        id: "speech",
        displayName: "Speech",
        description:
            "Work with voice, including text-to-speech, transcription, dialogue, and more.",
    },
    {
        // The first RESOURCE-backed leaves (add-resource-lifecycle-saperly):
        // real phone numbers owned by the workspace, with AI personas
        // answering and placing calls.
        id: "agentic-phone",
        displayName: "Agentic Phone",
        description:
            "Real phone numbers for AI agents — provision numbers, place " +
            "and answer calls with an AI persona, transcripts and " +
            "recordings.",
    },
    {
        id: "sms",
        displayName: "SMS",
        description: "Send and receive SMS from owned phone numbers.",
    },
    {
        id: "token-prices",
        displayName: "Token Prices",
        description:
            "Tools to pull token prices, including current and historical, across chains, and more.",
    },
    {
        id: "derivatives",
        displayName: "Derivatives & Perps",
        description:
            "Tools to pull crypto derivatives data, including perpetual funding, open interest, liquidations, options, and more.",
    },
    {
        id: "onchain-data",
        displayName: "On-chain Data",
        description:
            "Tools to pull on-chain data, including RPC access, indexers, analytics, and more.",
    },
    {
        id: "defi",
        displayName: "DeFi",
        description:
            "Tools to pull DeFi data, including protocol TVL, DEX volumes, fees, and more.",
    },
    {
        id: "yields",
        displayName: "Yields",
        description:
            "Tools to pull yield data, including pool APYs, historical rates, and more.",
    },
    {
        id: "prediction-markets",
        displayName: "Prediction Markets",
        description:
            "Tools to pull prediction market data, including Polymarket and Kalshi prices, volume, open interest, and more.",
    },
    {
        id: "crypto-signals",
        displayName: "Market Signals",
        description:
            "Tools to pull crypto market signals, including sentiment indexes, technical indicators, project scores, and more.",
    },
    {
        id: "web-extraction",
        displayName: "Content Extraction",
        description:
            "Tools to extract page content, including clean markdown from any URL, and more.",
    },
    {
        id: "seo",
        displayName: "SEO",
        description:
            "Tools to analyze search performance, including keywords, backlinks, traffic, and more.",
    },
    {
        id: "geo",
        displayName: "GEO",
        description:
            "Tools to measure visibility in AI answers, including brand mentions, cited pages, prompts, and more.",
    },
    {
        id: "legal-research",
        displayName: "Legal Research",
        description:
            "Primary law: statutes, regulations, court rules, constitutions, " +
            "and the citations between them.",
    },
    {
        id: "app-stores",
        displayName: "App Stores",
        description:
            "Tools to pull data from app stores, including Apple App Store " +
            "and Google Play listings, rankings, reviews, and more.",
    },
    {
        id: "image-search",
        displayName: "Image Search",
        description:
            "Tools to search the web for images, including from text or image " +
            "input, and more.",
    },
    {
        id: "video-search",
        displayName: "Video Search",
        description:
            "Tools to search the web for videos, including from a text query, " +
            "and more.",
    },
    {
        id: "equities",
        displayName: "Stocks & Funds",
        description:
            "Tools to pull public market data, including quotes, fundamentals, " +
            "earnings, screeners, and more.",
    },
]);
