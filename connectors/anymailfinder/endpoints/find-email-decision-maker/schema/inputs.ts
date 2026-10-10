import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** POST /find-email/decision-maker body - the vendor mirror
 *  (anymailfinder.com/email-finder-api/docs/find-decision-maker-email,
 *  2026-10-02). A company (domain or company_name) plus one to five
 *  departments; bound as a union in endpoint.ts. The ten standard
 *  departments are documented on the field; accounts can add approved
 *  custom ones, so the field is not an enum. */
export const zFindDecisionMakerEmailBody = z.object({
    domain: zDomain.optional(),
    company_name: zCompanyName.optional(),
    decision_maker_category: z.array(z.string().min(1)).min(1).max(5)
        .describe(
            "One to five departments, tried in order until a verified " +
                "email is found. Standard values: ceo (CEO / owner / " +
                "president / founder), engineering, finance, hr, it, " +
                "logistics, marketing, operations, buyer (procurement), " +
                "sales.",
        ).optional(),
}).strict();
