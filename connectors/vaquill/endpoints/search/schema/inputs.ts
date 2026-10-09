import { z } from "zod";
import {
    zActStatus,
    zCorpusType,
    zScopeState,
} from "../../../schema/common.ts";

/**
 * Faithful mirror of `StatuteSearchRequest`. Optionality only. The vendor's
 * documented defaults (`limit` 10, `includeBody` false, and the rest) are
 * materialized at the binding in endpoint.ts, where the estimate can read
 * them (design D25).
 *
 * Most filters accept ONE value or a LIST of them, which is the vendor's own
 * shape and not a convenience we invented.
 */

/** The publisher a document came from, where the corpus has more than one. */
const zSource = z.enum([
    "administrative_guidance",
    "ag_precedent",
    "agency_guidance",
    "bia_precedent",
    "bis_advisory_opinion",
    "cfpb_circular",
    "cfpb_enforcement_action",
    "cfpb_supervisory_guidance",
    "cftc_staff_letter",
    "cms_iom",
    "copyright_circular",
    "copyright_compendium",
    "cpsc_advisory_opinion",
    "cpsc_secg",
    "ddtc_commodity_jurisdiction",
    "ddtc_guidance",
    "dfars",
    "dfars_pgi",
    "doe_appliance_guidance",
    "doj_business_review",
    "doj_justice_manual",
    "doj_leniency",
    "eeoc_guidance",
    "far",
    "fcc_declaratory_ruling",
    "fdic_fil",
    "ferc_policy_statement",
    "fincen_amla_material",
    "fincen_boi_compliance_guide",
    "fincen_boi_faq",
    "fincen_boi_rule_qa",
    "fincen_guidance",
    "fincen_ruling",
    "frap",
    "frb_sr_letter",
    "frbp",
    "frcp",
    "frcrp",
    "fre",
    "ftc_administrative_decision",
    "ftc_advisory_opinion",
    "ftc_advocacy_filing",
    "ftc_hsr_interpretation",
    "ftc_policy_statement",
    "hhs_ocr_hipaa_faq",
    "hhs_ocr_hipaa_guidance",
    "hhs_ocr_resolution_agreement",
    "immigration_admin_precedent",
    "irs_announcement",
    "irs_irm",
    "irs_notice",
    "irs_rev_proc",
    "irs_rev_rul",
    "irs_written_determination",
    "merger_guidelines",
    "mpep",
    "mspb_nonprecedential",
    "mspb_precedential",
    "nlrb_advice_memo",
    "nlrb_board_decision",
    "nlrb_gc_memo",
    "occ_bulletin",
    "occ_interpretive_letter",
    "ofac_faq",
    "olc_opinion",
    "sct",
    "sec_commission_opinion",
    "senate_treaty",
    "senate_treaty_document",
    "senate_treaty_resolution",
    "ssa_ruling",
    "state_financial_bulletin",
    "state_insurance_bulletin",
    "tmep",
    "us_tax_treaty",
    "us_tax_treaty_technical_explanation",
    "uscis_policy_manual",
    "whd_foh",
    "whd_opinion_letter",
]);

/**
 * The response fields a hit may carry. A result row spans 140 of them and
 * most are null for any given corpus, so naming the handful you need is the
 * difference between a 200 KB page and a 4 KB one. Costs the same either way.
 */
const zField = z.enum([
    "abstract",
    "actId",
    "actStatus",
    "action",
    "adoptingCitations",
    "agencies",
    "agencySlugs",
    "alternateCitations",
    "amendmentHistory",
    "amendmentNote",
    "amendmentYears",
    "amendmentsCount",
    "articleName",
    "articleNumber",
    "audience",
    "body",
    "breadcrumb",
    "caseName",
    "chapter",
    "chapterName",
    "citation",
    "citationShort",
    "committeeNote",
    "corpusType",
    "court",
    "crossReferencesCfr",
    "crossReferencesUsc",
    "currencyNote",
    "currencyYear",
    "currentThrough",
    "datesText",
    "displayLabel",
    "displayPath",
    "documentNumber",
    "documentSubtype",
    "documentTypeLabel",
    "docxUrl",
    "edition",
    "effectiveDate",
    "effectiveDateRaw",
    "excerpt",
    "expirationDate",
    "expirationDateRaw",
    "externalUrl",
    "federalRegisterCitations",
    "forum",
    "frCommentsCloseOn",
    "frCorrectionOf",
    "frCorrections",
    "frDocketIds",
    "frEffectiveOn",
    "frEndPage",
    "frRegulationIdNumbers",
    "frRegulationsDotGovUrl",
    "frRelatedDocuments",
    "frSignificant",
    "frStartPage",
    "frVolume",
    "goodLawStatus",
    "govInfoHtmlUrl",
    "govInfoPdfUrl",
    "granuleId",
    "history",
    "htmlUrl",
    "implementingRegulations",
    "issueDate",
    "issueDateRaw",
    "issuingAgency",
    "languageCode",
    "lastAmendedDate",
    "lastAmendedYear",
    "lawImplemented",
    "licenseNote",
    "originalEnactmentDate",
    "originalEnactmentDateRaw",
    "packageId",
    "parent",
    "part",
    "partName",
    "pdfUrl",
    "popularName",
    "president",
    "priorEffectiveDates",
    "program",
    "publicLawCites",
    "publicLaws",
    "publicationDate",
    "publisherKey",
    "referencedShortTitles",
    "relatedCitations",
    "relatedDocuments",
    "releaseDate",
    "relevanceScore",
    "renumberedTo",
    "renumberedToLabel",
    "requesters",
    "rescindedOn",
    "rescindedOnRaw",
    "reviewDate",
    "ruleSet",
    "ruleSetCode",
    "sectionNumber",
    "sectionTitle",
    "settlementAmount",
    "signingDate",
    "signingDateRaw",
    "source",
    "sourceCharEnd",
    "sourceCharStart",
    "sourceCredit",
    "sourceNote",
    "sourcePageEnd",
    "sourcePageStart",
    "state",
    "stateHtmlUrl",
    "statutoryAuthority",
    "subchapter",
    "subchapterName",
    "subject",
    "subjectNumber",
    "subpart",
    "subpartName",
    "subtitle",
    "subtitleName",
    "supersededBy",
    "supersedes",
    "supersessionActions",
    "textUrl",
    "title",
    "titleName",
    "titleNumber",
    "topLevelTitle",
    "topics",
    "transferredTo",
    "transferredToLabel",
    "versionId",
    "volume",
    "wordCount",
    "xmlUrl",
    "year",
]);

/** A real calendar date, so `2026-02-30` fails here rather than at the
 *  vendor. Compiles to a `date` format the engine enforces. */
const zDateString = z.iso.date();

export const zStatuteSearchBody = z.object({
    query: z.string().min(2).max(500).describe(
        "The search query, in natural language. Ranking is hybrid " +
            "semantic plus keyword, so a question phrased the way a lawyer " +
            "would ask it works as well as a term of art.",
    ),
    corpusType: z.union([zCorpusType, z.array(zCorpusType)]).describe(
        "Restrict to one body of law, or a list of them. `USC` and `CFR` " +
            "are the federal code and regulations, `STATE` a state " +
            "statutory code, `REGULATION` a state administrative code, " +
            "`STATE_RULES` court rules. Omit to search everything.",
    ).optional(),
    state: z.union([zScopeState, z.array(zScopeState)]).describe(
        "Restrict to one jurisdiction, or a list. `federal` means the " +
            "federal corpora rather than a state.",
    ).optional(),
    code: z.union([z.string(), z.array(z.string())]).describe(
        "Restrict to specific state statutory codes, e.g. `tx_pe` for the " +
            "Texas Penal Code. Values are the `actId`s returned by " +
            "`/us/statutes/divisions` with `corpusType=STATE`, so a browse " +
            "result can be fed straight back in.",
    ).optional(),
    yearFrom: z.number().int().min(1700).max(2100).describe(
        "Only return sections dated in or after this year.",
    ).optional(),
    yearTo: z.number().int().min(1700).max(2100).describe(
        "Only return sections dated in or before this year. It filters the " +
            "LAST such date, so a section amended in 2025 is excluded by " +
            "`yearTo=2024` even though it existed then.",
    ).optional(),
    excludeRepealed: z.boolean().describe(
        "Drop sections whose own status says they are no longer operative " +
            "(repealed, renumbered, transferred, expired, superseded, and " +
            "the rest of the dead vocabulary). A section carrying NO " +
            "recorded status is kept, because a missing status is not " +
            "evidence of repeal.",
    ).optional(),
    actStatus: z.union([zActStatus, z.array(zActStatus)]).describe(
        "Return only sections carrying this status. The inverse of " +
            "`excludeRepealed`, and the way to audit dead law on purpose.",
    ).optional(),
    changedSince: zDateString.describe(
        "Only return sections we have OBSERVED change on or after this " +
            "date (`YYYY-MM-DD`). This is the sync filter: it turns a " +
            "lookup into something a nightly job can poll.",
    ).optional(),
    agency: z.union([z.string(), z.array(z.string())]).describe(
        "Federal Register agency slug, e.g. `environmental-protection-" +
            "agency`. Applies to `FEDERAL_REGISTER` and `EXECUTIVE_ACTION`; " +
            "other corpora carry no agency.",
    ).optional(),
    documentType: z.enum(["final", "proposed", "presidential"]).describe(
        "Federal Register document stage: `final` is a rule in force, " +
            "`proposed` an NPRM, `presidential` a Presidential Document.",
    ).optional(),
    publishedFrom: zDateString.describe(
        "Only return Federal Register documents published on or after this " +
            "date. This is the PUBLICATION date, not `yearFrom`'s version " +
            "year.",
    ).optional(),
    publishedTo: zDateString.describe(
        "Only return Federal Register documents published on or before " +
            "this date.",
    ).optional(),
    titleNumber: z.number().int().describe(
        "USC or CFR title number, e.g. 17 for securities, 42 for civil " +
            "rights. Only meaningful for `USC` and `CFR`; state titles are " +
            "alphabetic.",
    ).optional(),
    chapter: z.union([z.string(), z.array(z.string())]).describe(
        "Scope to one or more chapters within a title or code. This is the " +
            "search side of each hit's `parent.chapter`, so a hit can be " +
            "passed straight back to search its neighbourhood.",
    ).optional(),
    part: z.union([z.string(), z.array(z.string())]).describe(
        "Scope to one or more CFR parts, e.g. `240` for 17 C.F.R. Part " +
            "240. The CFR counterpart to `chapter`; pair it with " +
            "`titleNumber`.",
    ).optional(),
    source: z.union([zSource, z.array(zSource)]).describe(
        "Restrict to a publisher within a corpus, e.g. `irs_rev_rul` for " +
            "IRS revenue rulings or `frcp` for the Federal Rules of Civil " +
            "Procedure.",
    ).optional(),
    fields: z.array(zField).describe(
        "Return only these fields on each hit. A row spans 140 fields and " +
            "most are null for any one corpus, so naming what you need is " +
            "the difference between a 200 KB page and a 4 KB one. Costs " +
            "the same either way.",
    ).optional(),
    limit: z.number().int().min(1).max(50).describe(
        "Results per page.",
    ).optional(),
    offset: z.number().int().min(0).max(70).describe(
        "How many results to skip, for paging. Every page of a query is " +
            "cut from one ranking, so results never repeat or go missing " +
            "between pages, and a later page costs no more than the first.",
    ).optional(),
    includeBody: z.boolean().describe(
        "Return each hit's full text inline on `body` instead of fetching " +
            "it per section afterwards. Adds the ordinary body price per " +
            "row that returns text; rows whose text cannot be resolved come " +
            "back null and are not charged.",
    ).optional(),
    excerptChars: z.number().int().min(100).max(4000).describe(
        "Characters of matching text to include in each hit's `excerpt`. " +
            "The excerpt is a ranking preview, not the section.",
    ).optional(),
    matchType: z.enum(["any", "all", "phrase"]).describe(
        "Exact versus semantic matching, so no separate keyword mode is " +
            "needed. `any` is hybrid ranking and suits natural-language " +
            "questions; `all` requires every term; `phrase` requires the " +
            "exact phrase.",
    ).optional(),
});
