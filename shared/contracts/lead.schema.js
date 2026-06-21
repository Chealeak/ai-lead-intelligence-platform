import { z } from "zod";

export const ComplexitySchema = z.enum(["low", "medium", "high", "unknown"]);

export const LeadCreateRequestSchema = z.object({
    email: z.string().trim().min(1, "email is required").email("email must be valid"),
    company: z.string().trim().nullable().optional(),
    message: z.string().trim().min(1, "message is required"),
});

export const AnalyzeRequestSchema = z.object({
    message: z.string().trim().min(1, "message is required"),
});

export const SimilarProjectSchema = z.object({
    id: z.coerce.number(),
    reason: z.string(),
});

export const AnalysisResultSchema = z.object({
    intent: z.string(),
    complexity: ComplexitySchema.or(z.string()),
    estimatedCost: z.string(),
    similarProjects: z.array(SimilarProjectSchema).default([]),
});

export const BackendLeadResponseSchema = z.object({
    status: z.literal("created"),
    id: z.number(),
    ai: AnalysisResultSchema,
});

export const BackendErrorResponseSchema = z.object({
    status: z.literal("error").optional(),
    message: z.string(),
    error: z.string().optional(),
    details: z.unknown().optional(),
});

export const BffAnalysisSchema = z.object({
    intent: z.string().nullable(),
    complexity: z.string().nullable(),
    estimatedCost: z.string().nullable(),
    projects: z.array(SimilarProjectSchema),
});

export const BffLeadSuccessResponseSchema = z.object({
    success: z.literal(true),
    analysis: BffAnalysisSchema,
});

export const BffLeadErrorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
});

export const BffLeadResponseSchema = z.discriminatedUnion("success", [
    BffLeadSuccessResponseSchema,
    BffLeadErrorResponseSchema,
]);
