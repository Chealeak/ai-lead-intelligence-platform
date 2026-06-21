import { BffLeadSuccessResponseSchema } from "../contracts/lead.schema.js";

/**
 * @param {import('../types/index.js').BackendLeadResponse} backendData
 */
export function toBffLeadResponse(backendData) {
    return BffLeadSuccessResponseSchema.parse({
        success: true,
        analysis: {
            intent: backendData.ai.intent ?? null,
            complexity: backendData.ai.complexity ?? null,
            estimatedCost: backendData.ai.estimatedCost ?? null,
            projects: backendData.ai.similarProjects ?? [],
        },
    });
}

/**
 * @param {string} message
 */
export function toBffErrorResponse(message) {
    return {
        success: false,
        message,
    };
}

/**
 * @param {import('../types/index.js').AnalysisResult} analysis
 */
export function normalizeAnalysisResult(analysis) {
    return {
        intent: analysis.intent ?? "unknown",
        complexity: analysis.complexity ?? "unknown",
        estimatedCost: analysis.estimatedCost ?? "unknown",
        similarProjects: Array.isArray(analysis.similarProjects)
            ? analysis.similarProjects.map((project) => ({
                  id: project.id,
                  reason: project.reason,
              }))
            : [],
    };
}
