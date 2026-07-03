import { BffConversationSuccessResponseSchema } from "../contracts/conversation.schema.js";

/**
 * @param {import('../types/index.js').BackendConversationResponse} backendData
 */
export function toBffConversationResponse(backendData) {
    return BffConversationSuccessResponseSchema.parse({
        success: true,
        conversationId: backendData.conversationId,
        state: backendData.state,
        email: backendData.email ?? null,
        company: backendData.company ?? null,
        messages: backendData.messages,
        assistant: backendData.assistant,
    });
}

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeAssistantResponse(raw) {
    const similarProjects = Array.isArray(raw.similarProjects)
        ? raw.similarProjects.map((project) => ({
              projectId: project.projectId ?? project.id,
              reason: project.reason ?? "",
          }))
        : [];

    return {
        intent: raw.intent ?? "general_inquiry",
        conversationState: raw.conversationState ?? "WAITING_REQUIREMENTS",
        missingInformation: Array.isArray(raw.missingInformation) ? raw.missingInformation : [],
        nextAction: raw.nextAction ?? "ask_questions",
        assistantMessage: raw.assistantMessage ?? "How can I help you with your project?",
        estimatedCost: raw.estimatedCost ?? null,
        complexity: raw.complexity ?? null,
        similarProjects,
        suggestedActions: Array.isArray(raw.suggestedActions) ? raw.suggestedActions : [],
        proposalContent: raw.proposalContent ?? null,
    };
}
