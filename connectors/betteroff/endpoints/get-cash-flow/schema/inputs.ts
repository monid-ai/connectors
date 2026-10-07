import { z } from "zod";

export const zBody = z.strictObject({
    startDate: z.iso.date().nullable(),
    endDate: z.iso.date().nullable(),
});
