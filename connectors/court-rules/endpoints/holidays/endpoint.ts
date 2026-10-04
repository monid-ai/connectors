import { defineEndpoint } from "@shared/core";
import { zCourtRulesHolidaysQuery } from "./schema/inputs.ts";

/**
 * Court Rules: court holidays -
 * `GET https://api.courtrules.app/api/v1/holidays`.
 *
 * Closure dates for a district (or the federal-wide calendar), which is the
 * input deadline math needs: a filing deadline that lands on a closure rolls
 * under the court's own rules. Calendars are published through 2027.
 * Read-only, and FREE: no meter, so usage settles at zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Court Rules: Court Holidays",
        summary:
            "Court closure dates for deadline math, by district and year.",
        description:
            "Returns court closure dates for a district (or the " +
            "federal-wide calendar when no district is given) so a filing " +
            "deadline can be checked against the days the court is shut. " +
            "Calendars are published through 2027.",
        docsUrl: "https://docs.courtrules.app/api-reference/holidays",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/api/v1/holidays" },
    input: { schema: { queryParams: zCourtRulesHolidaysQuery } },
});
