import { z } from "zod";
import { ComplexitySchema, SimilarProjectSchema } from "./lead.schema.js";

export const ConversationStateSchema = z.enum([
    "WAITING_REQUIREMENTS",
    "GATHERING_DETAILS",
    "READY_FOR_ESTIMATE",
    "ESTIMATE_PROVIDED",
    "OFFERING_PROPOSAL",
    "PROPOSAL_REQUESTED",
    "PROPOSAL_GENERATING",
    "COMPLETED",
]);

export const MissingInformationSchema = z.enum([
    "project_description",
    "business_goal",
    "integrations",
    "expected_users",
    "timeline",
    "budget",
    "email",
]);

export const NextActionSchema = z.enum([
    "ask_questions",
    "provide_estimate",
    "offer_proposal",
    "generate_proposal",
    "send_email",
    "handoff_to_sales",
    "request_meeting",
    "continue_conversation",
]);

export const ConversationMessageRoleSchema = z.enum(["user", "assistant"]);
export const ConversationPublicIdSchema = z.string().uuid();

export const ConversationHistoryMessageSchema = z.object({
    role: ConversationMessageRoleSchema,
    content: z.string(),
});

export const SuggestedActionSchema = z.object({
    label: z.string(),
    action: z.string(),
});

export const ProposalContentSchema = z.object({
    title: z.string(),
    summary: z.string(),
    scope: z.array(z.string()).default([]),
    deliverables: z.array(z.string()).default([]),
    timeline: z.string().nullable().optional(),
    investment: z.string().nullable().optional(),
    assumptions: z.array(z.string()).default([]),
});

export const AssistantResponseSchema = z.object({
    intent: z.string(),
    conversationState: ConversationStateSchema.or(z.string()),
    missingInformation: z.array(MissingInformationSchema.or(z.string())).default([]),
    nextAction: NextActionSchema.or(z.string()),
    assistantMessage: z.string(),
    estimatedCost: z.string().nullable().optional(),
    complexity: ComplexitySchema.or(z.string()).nullable().optional(),
    similarProjects: z
        .array(
            z.object({
                projectId: z.coerce.number(),
                reason: z.string(),
            })
        )
        .default([]),
    suggestedActions: z.array(SuggestedActionSchema).default([]),
    proposalContent: ProposalContentSchema.nullable().optional(),
});

export const ChatRequestSchema = z.object({
    message: z.string().trim().min(1, "message is required"),
    history: z.array(ConversationHistoryMessageSchema).default([]),
    conversationState: ConversationStateSchema.or(z.string()).default("WAITING_REQUIREMENTS"),
    leadContext: z
        .object({
            email: z.string().nullable().optional(),
            company: z.string().nullable().optional(),
        })
        .default({}),
    actionHint: z.string().nullable().optional(),
});

export const ConversationCreateRequestSchema = z.object({
    email: z.string().trim().email().nullable().optional(),
    company: z.string().trim().nullable().optional(),
});

export const ConversationMessageRequestSchema = z.object({
    message: z.string().trim().min(1, "message is required"),
    action: z.string().nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    company: z.string().trim().nullable().optional(),
});

export const ConversationMessageResponseSchema = z.object({
    role: ConversationMessageRoleSchema,
    content: z.string(),
    createdAt: z.string(),
    metadata: z.record(z.unknown()).nullable().optional(),
});

export const BackendConversationResponseSchema = z.object({
    conversationId: ConversationPublicIdSchema,
    state: z.string(),
    email: z.string().nullable(),
    company: z.string().nullable(),
    messages: z.array(ConversationMessageResponseSchema),
    assistant: AssistantResponseSchema,
});

export const BffConversationSuccessResponseSchema = z.object({
    success: z.literal(true),
    conversationId: ConversationPublicIdSchema,
    state: z.string(),
    email: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    messages: z.array(ConversationMessageResponseSchema),
    assistant: AssistantResponseSchema,
});

export const BffConversationErrorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
});

export const BffConversationResponseSchema = z.discriminatedUnion("success", [
    BffConversationSuccessResponseSchema,
    BffConversationErrorResponseSchema,
]);
