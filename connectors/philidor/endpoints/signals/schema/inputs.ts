import { z } from "zod";
import { zPaginationQuery } from "../../../schema/common.ts";

export const zSignalsQueryParams = zPaginationQuery.extend({
    severity: z.string().optional().describe(
        "Comma-separated severities: Info, Watch, RiskChange, PolicyBreach.",
    ),
    entity: z.string().optional().describe("Entity id filter."),
    vault: z.string().optional().describe("Vault id filter."),
    category: z.string().optional(),
    since: z.iso.datetime({ offset: true }).optional().describe(
        "Return only signals published after this ISO-8601 timestamp.",
    ),
});
