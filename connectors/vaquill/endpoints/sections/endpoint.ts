import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStatuteSectionsBody } from "./schema/inputs.ts";

/**
 * `POST /us/statutes/sections`: metadata for up to 50 sections in one call.
 *
 * Billed PER SECTION RETURNED, not per id asked for: an id that resolves to
 * nothing lands in `notFound` and is refunded. Verified live 2026-09-17:
 * one good id and one junk id billed 2, not 4.
 *
 * `includeBody` adds the ordinary 6-credit body line per row that returns
 * text, on the same terms as search.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get US Statute Sections (Batch)",
        summary: "Metadata for up to 50 statute sections in one call.",
        description: "Fetch metadata for up to 50 sections at once by " +
            "`actId`: citation, title, hierarchy, status, currency, " +
            "amendment history and cross-references. This is the batch " +
            "form of the single-section lookup and the natural follow-up " +
            "to a search or a citation resolve. Ids that resolve to " +
            "nothing come back in `notFound` and are not charged. Set " +
            "`includeBody` to pull each section's full text inline rather " +
            "than making one body call per id.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-metadata-for-many-statute-sections",
        categories: ["legal-research"],
    },
    request: { method: "POST", path: "/us/statutes/sections" },
    input: {
        schema: {
            body: zStatuteSectionsBody.extend({
                includeBody: zStatuteSectionsBody.shape.includeBody.unwrap()
                    .default(false),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                section: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                    label: "section metadata",
                    description: "one per section actually returned",
                },
                body: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 6 },
                    label: "inline full text",
                    description:
                        "one per returned section that carries full text " +
                        "under includeBody",
                },
            },
        },
        /** The request list is all a pre-run promise can read, so the
         *  estimate assumes every id resolves. A batch with misses settles
         *  BELOW this, never above. */
        estimate: ({ data }) => {
            // DISTINCT ids: the vendor collapses duplicates before pricing,
            // so three copies of one actId bill 2, not 6 (verified live).
            // `Set` is not a whitelisted closed-term global.
            const ids = data.input.body.actIds;
            const asked = ids.filter((id, at) => ids.indexOf(id) === at).length;
            return {
                counts: {
                    section: asked,
                    ...(data.input.body.includeBody ? { body: asked } : {}),
                },
            };
        },
        /** Count what came back. `notFound` ids are refunded, and a row
         *  whose text could not be resolved carries `body: null` and is
         *  refunded for the body line alone. */
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalGet(data.output, "$.sections");
            const rows = Array.isArray(found) ? found : [];
            const bodies = rows.filter((row) =>
                row !== null && typeof row === "object" &&
                !Array.isArray(row) && typeof row.body === "string" &&
                row.body.length > 0
            ).length;
            return {
                counts: {
                    section: rows.length,
                    ...(bodies > 0 ? { body: bodies } : {}),
                },
            };
        },
    },
});
