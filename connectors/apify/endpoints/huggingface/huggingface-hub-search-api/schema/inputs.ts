import { z } from "zod";

/**
 * conserving_celerytop/huggingface-hub-search-api: actor input schema,
 * derived from the actor's PUBLISHED input schema (GET
 * /v2/acts/conserving_celerytop~huggingface-hub-search-api/builds/default,
 * actorDefinition.input) on 2026-10-04. Hand-written in the shape of
 * scripts/apify-scaffold.ts output (the scaffold needs jsr, which the
 * authoring sandbox could not reach); curated by hand thereafter (re-run
 * the script to refresh; the drift suite flags divergence, see
 * `deno task drift`). Non-strict by policy: the actor accepts supersets,
 * so unknown fields pass through.
 */
export const zHuggingfaceHubSearchApiBody = z.object({
    resource: z.enum(["models", "datasets", "spaces", "papers"]).describe(
        "Choose what to list: models, datasets, Spaces or daily papers.",
    ).optional(),
    searchQuery: z.string().max(250).describe(
        "Type words from the repository name, for example llama or sentiment. For papers, type a topic, for example diffusion. Leave it empty to list the top results for your sort order.",
    ).optional(),
    maxItems: z.number().int().min(1).max(10000).describe(
        "Set how many rows to return, from 1 to 10,000. Each saved row is one charged result. A paper search returns up to 120 rows.",
    ).optional(),
    owner: z.string().describe(
        "Enter an owner namespace to list its repositories, for example meta-llama or google. Applies to models, datasets and Spaces.",
    ).optional(),
    task: z.string().describe(
        "Enter a task name, for example text-generation or text-classification. For models this is the pipeline tag, for datasets the task category.",
    ).optional(),
    license: z.string().describe(
        "Enter a license id, for example apache-2.0 or mit.",
    ).optional(),
    language: z.string().describe(
        "Enter a language code, for example en or de. Applies to models and datasets.",
    ).optional(),
    library: z.string().describe(
        "Enter a library name, for example transformers or diffusers. Applies to models.",
    ).optional(),
    spaceSdk: z.enum(["gradio", "streamlit", "docker", "static"]).describe(
        "Choose the SDK a Space is built with. Applies to Spaces.",
    ).optional(),
    sortBy: z.enum([
        "default",
        "downloads",
        "likes",
        "trendingScore",
        "createdAt",
        "lastModified",
    ]).describe(
        "Choose the ranking. The default is downloads for models and datasets, likes for Spaces and the Hub's newest-first order for papers. Spaces rank by likes, trending score, created or modified. Papers rank by trending score or by the Hub's newest-first order.",
    ).optional(),
    tags: z.array(z.string()).max(10).describe(
        "Add Hub tags to narrow the list, for example task_categories:text-classification or size_categories:1M<n<10M. Rows match all tags.",
    ).optional(),
    paperDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe(
        "Enter a day as YYYY-MM-DD to list the papers featured on that day, for example 2026-10-01. Applies to papers when the search text is empty.",
    ).optional(),
});
