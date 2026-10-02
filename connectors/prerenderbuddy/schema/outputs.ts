import { z } from "zod";

// Documentation only: preserve future fields rather than reject a paid result.
const zSource = z.object({
    url: z.string().optional(),
    title: z.string().nullable().optional(),
    hostname: z.string().optional(),
    relationship: z.string().optional(),
}).passthrough();

const zEvidence = z.object({
    name: z.string().optional(),
    mentioned: z.boolean().optional(),
    recommendationDetected: z.boolean().optional(),
    websiteCited: z.boolean().nullable().optional(),
    mentions: z.array(z.unknown()).optional(),
    recommendations: z.array(z.unknown()).optional(),
}).passthrough();

export const zJob = z.object({
    jobId: z.string().optional(),
    platform: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    completedAt: z.string().nullable().optional(),
    expiresAt: z.string().optional(),
    pollAfterSeconds: z.number().optional(),
    replayed: z.boolean().optional(),
    billing: z.object({
        currency: z.string().optional(),
        reservedUsd: z.number().optional(),
        chargedUsd: z.number().optional(),
        rateVersion: z.string().optional(),
    }).passthrough().optional(),
    result: z.object({
        answer: z.string().optional(),
        citations: z.array(zSource).optional(),
        sources: z.array(zSource).optional(),
        brand: zEvidence.nullable().optional(),
        competitors: z.array(zEvidence).optional(),
        methodology: z.record(z.string(), z.unknown()).optional(),
    }).passthrough().optional(),
    error: z.object({
        code: z.string().optional(),
        message: z.string().optional(),
    }).passthrough().optional(),
}).passthrough();

export const zAccount = z.object({
    currency: z.string().optional(),
    balanceUsd: z.number().optional(),
    reservedUsd: z.number().optional(),
    availableUsd: z.number().optional(),
}).passthrough();
