import { z } from "zod";
import { zBrandId } from "../../../schema/common.ts";

/** MCP `get_brand_memory` arguments — hosted schema 2026-09-22. */
export const zGetBrandMemoryBody = z.object({
    brandId: zBrandId,
});
