import { z } from "zod";

/** GET /devices query — mirror of qbraid-api device/validators.ts
 *  `deviceSchemas.listDevices` (D25: optionality only). The admin-only
 *  vendor placeholder 'NEEDS ADMIN APPROVAL' is not offered. Booleans and
 *  numbers ride the wire as strings — the engine stringifies scalars. */
export const zListDevicesQueryParams = z.object({
    deviceType: z.enum(["QPU", "SIMULATOR"]).describe(
        "Hardware type: real quantum processors or simulators.",
    ).optional(),
    status: z.enum(["ONLINE", "OFFLINE", "RETIRED", "UNAVAILABLE"]).describe(
        "Operational status filter.",
    ).optional(),
    vendor: z.enum(["aws", "azure", "ibm", "ionq", "qbraid"]).describe(
        "Cloud vendor the device is reached through.",
    ).optional(),
    providerId: z.string().describe(
        "Provider id (the _id from qbraid#list-providers).",
    ).optional(),
    qrn: z.string().describe("Exact device QRN filter.").optional(),
    search: z.string().min(1).max(255).describe(
        "Free-text search over name, description and about.",
    ).optional(),
    sortBy: z.enum([
        "name",
        "vendor",
        "deviceType",
        "status",
        "numberQubits",
        "createdAt",
        "updatedAt",
    ]).describe("Sort field (vendor default: name).").optional(),
    sortOrder: z.enum(["asc", "desc"]).describe("Sort direction.").optional(),
    page: z.number().int().min(1).describe("1-based page number.").optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Devices per page, max 100 (vendor default 20).",
    ).optional(),
    retired: z.boolean().describe("Include retired devices.").optional(),
    private: z.boolean().describe(
        "true = private devices only, false = public only.",
    ).optional(),
    verified: z.boolean().describe("Filter by verification status.")
        .optional(),
    directAccess: z.boolean().describe(
        "Filter by direct-access availability.",
    ).optional(),
});
