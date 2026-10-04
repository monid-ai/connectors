import { z } from "zod";

/**
 * conserving_celerytop/huggingface-hub-search-api: dataset ITEM schema.
 * This actor publishes NO storages.dataset.fields (the published block is
 * an empty object, so apify:scaffold has nothing to generate from), so the
 * field list is derived from the actor's published dataset views
 * (GET /v2/acts/conserving_celerytop~huggingface-hub-search-api/builds/default →
 * actorDefinition.storages.dataset.views) plus the item keys of one real
 * run (2026-10-04, resource=models, sortBy=trendingScore). Passthrough
 * DOCUMENTATION (design D29): non-strict, every field optional: output
 * validation can never fail a paid run over vendor drift. One row per
 * Hub model, dataset, Space or paper; fields that do not apply to the
 * row's recordType are null.
 */
export const zHuggingfaceHubSearchApiOutputItem = z.object({
    rank: z.any().describe("Position of the row in the result list")
        .optional(),
    recordType: z.any().describe(
        "Type of the row: model, dataset, space or paper",
    ).optional(),
    id: z.any().describe("Hub repository id (owner/name) or paper id")
        .optional(),
    owner: z.any().describe("Owner namespace of the repository").optional(),
    name: z.any().describe("Repository name without the owner").optional(),
    url: z.any().describe("Link to the item on the Hugging Face Hub")
        .optional(),
    title: z.any().describe("Paper title (papers only)").optional(),
    description: z.any().describe("Short description (datasets)").optional(),
    task: z.any().describe(
        "Pipeline tag for models, task category for datasets",
    ).optional(),
    library: z.any().describe("Library name (models)").optional(),
    license: z.any().describe("License id").optional(),
    languages: z.array(z.string()).describe("Language codes").optional(),
    downloads: z.any().describe("Downloads in the last 30 days").optional(),
    downloadsAllTime: z.any().describe("Downloads over all time").optional(),
    likes: z.any().describe("Number of likes").optional(),
    trendingScore: z.any().describe("Hub trending score").optional(),
    parameters: z.any().describe("Parameter count (models)").optional(),
    gated: z.any().describe("Whether access is gated").optional(),
    sdk: z.any().describe("SDK a Space is built with").optional(),
    runtimeStage: z.any().describe("Runtime stage of a Space").optional(),
    hardware: z.any().describe("Hardware a Space runs on").optional(),
    upvotes: z.any().describe("Number of upvotes (papers)").optional(),
    numComments: z.any().describe("Number of comments (papers)").optional(),
    organization: z.any().describe("Organization behind the paper")
        .optional(),
    githubRepo: z.any().describe("Linked GitHub repository (papers)")
        .optional(),
    githubStars: z.any().describe("Stars of the linked GitHub repository")
        .optional(),
    projectPage: z.any().describe("Project page link (papers)").optional(),
    publishedAt: z.any().describe("ISO timestamp the paper was published")
        .optional(),
    createdAt: z.any().describe("ISO timestamp of creation").optional(),
    lastModified: z.any().describe("ISO timestamp of the last modification")
        .optional(),
    tags: z.array(z.string()).describe("Hub tags of the repository")
        .optional(),
    keywords: z.array(z.string()).describe("Paper keywords").optional(),
    aiSummary: z.any().describe("AI-generated paper summary").optional(),
    arxivUrl: z.any().describe("Link to the arXiv page (papers)").optional(),
    fetchedAt: z.any().describe("ISO timestamp the row was fetched")
        .optional(),
    message: z.any().describe(
        "Message row returned when a search has no matches",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object: validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zHuggingfaceHubSearchApiOutput = z.array(
    zHuggingfaceHubSearchApiOutputItem.or(z.record(z.string(), z.unknown())),
);
