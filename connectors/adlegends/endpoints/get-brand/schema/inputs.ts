import { z } from "zod";
import { zBrandId } from "../../../schema/common.ts";

/** MCP `get_brand` arguments — hosted schema 2026-09-22. */
export const zGetBrandBody = z.object({
    brandId: zBrandId,
});
