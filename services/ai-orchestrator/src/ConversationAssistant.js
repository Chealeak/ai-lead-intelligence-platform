import { ProjectReferenceService } from "./ProjectReferenceService.js";
import {
    AssistantResponseSchema,
    ConversationStateSchema,
    NextActionSchema,
} from "@ai-lead-intelligence/shared/contracts/conversation.schema.js";
import { normalizeAssistantResponse } from "@ai-lead-intelligence/shared/utils";

function parseLlmJson(content) {
    if (!content || typeof content !== "string") {
        throw new Error("Empty LLM response content");
    }

    const trimmed = content.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const jsonText = fenced ? fenced[1] : trimmed;

    return JSON.parse(jsonText);
}

function formatProjectReference(project) {
    const budget =
        project.budgetMin != null && project.budgetMax != null
            ? `$${project.budgetMin}-$${project.budgetMax}`
            : "n/a";
    const tags = Array.isArray(project.tags) ? project.tags.join(", ") : "n/a";

    return [
        `ID: ${project.id}`,
        `Name: ${project.name}`,
        `Description: ${project.description}`,
        `Industry: ${project.industry ?? "n/a"}`,
        `Budget: ${budget}`,
        `Duration: ${project.durationMonths ?? "n/a"} months`,
        `Team size: ${project.teamSize ?? "n/a"}`,
        `Tags: ${tags}`,
    ].join("\n");
}

function formatHistory(history) {
    if (!history.length) {
        return "No prior messages.";
    }

    return history
        .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
        .join("\n");
}

const REQUIRED_INFO = [
    "project_description",
    "business_goal",
    "integrations",
    "expected_users",
    "timeline",
];

export class ConversationAssistant {
    constructor({
        projectReferenceService = new ProjectReferenceService(),
        apiKey = process.env.OPENROUTER_API_KEY,
        model = "openai/gpt-4o-mini",
    } = {}) {
        this.projectReferenceService = projectReferenceService;
        this.apiKey = apiKey;
        this.model = model;
    }

    buildPrompt({ message, history, conversationState, leadContext, projects, actionHint }) {
        const referencesBlock =
            projects.length > 0
                ? projects.map((project) => formatProjectReference(project)).join("\n\n")
                : "No past project references available.";

        const system = [
            "You are an AI Sales Assistant for a software development agency.",
            "You guide prospects through a structured sales conversation using explicit state transitions.",
            "Always respond with ONLY valid JSON matching the required schema.",
            "",
            "Conversation states:",
            "WAITING_REQUIREMENTS, GATHERING_DETAILS, READY_FOR_ESTIMATE, ESTIMATE_PROVIDED,",
            "OFFERING_PROPOSAL, PROPOSAL_REQUESTED, PROPOSAL_GENERATING, COMPLETED",
            "",
            "Required information to collect (budget is optional):",
            REQUIRED_INFO.join(", "),
            "",
            "Next actions (pick exactly one):",
            "ask_questions, provide_estimate, offer_proposal, generate_proposal, send_email,",
            "handoff_to_sales, request_meeting, continue_conversation",
            "",
            "Rules:",
            "- Use the full conversation history; never treat the latest message in isolation.",
            "- Ask only for missing required information; do not repeat questions already answered.",
            "- When enough detail exists, move toward READY_FOR_ESTIMATE and provide_estimate.",
            "- After giving an estimate, set state to ESTIMATE_PROVIDED and offer_proposal.",
            "- NEVER set nextAction to generate_proposal unless the user explicitly confirmed they want a proposal.",
            "- When nextAction is generate_proposal, include proposalContent with title, summary, scope, deliverables, timeline, investment, assumptions.",
            "- Use similar project references for estimates; only reference project IDs from provided references.",
            "- assistantMessage must be natural, concise, and conversational (shown directly to the user).",
            "- suggestedActions: provide 0-3 button labels when helpful (e.g. Generate Proposal, Book a Meeting).",
            "",
            "JSON schema:",
            "{",
            '  "intent": string,',
            '  "conversationState": string,',
            '  "missingInformation": string[],',
            '  "nextAction": string,',
            '  "assistantMessage": string,',
            '  "estimatedCost": string|null,',
            '  "complexity": "low"|"medium"|"high"|null,',
            '  "similarProjects": [{ "projectId": number, "reason": string }],',
            '  "suggestedActions": [{ "label": string, "action": string }],',
            '  "proposalContent": { title, summary, scope[], deliverables[], timeline, investment, assumptions[] }|null',
            "}",
        ].join("\n");

        const user = [
            `Current conversation state: ${conversationState}`,
            `Lead email: ${leadContext.email ?? "not provided"}`,
            `Lead company: ${leadContext.company ?? "not provided"}`,
            actionHint ? `User triggered action: ${actionHint}` : null,
            "",
            "Conversation history:",
            formatHistory(history),
            "",
            "Latest user message:",
            message,
            "",
            "Retrieved similar project references:",
            referencesBlock,
        ]
            .filter(Boolean)
            .join("\n");

        return { system, user };
    }

    buildRagQuery(history, message) {
        const recent = history
            .slice(-6)
            .map((entry) => entry.content)
            .join(" ");

        return `${recent} ${message}`.trim();
    }

    async fetchRelevantProjects(history, message) {
        const query = this.buildRagQuery(history, message);

        try {
            const similar = await this.projectReferenceService.searchSimilar(query, 5);
            if (similar.length > 0) {
                return similar;
            }
        } catch (error) {
            console.warn("RAG search failed, falling back to all project references:", error.message);
        }

        return this.projectReferenceService.getProjects();
    }

    async chat({ message, history, conversationState, leadContext, actionHint }) {
        if (!this.apiKey) {
            throw new Error("OPENROUTER_API_KEY is not configured");
        }

        const projects = await this.fetchRelevantProjects(history, message);
        const { system, user } = this.buildPrompt({
            message,
            history,
            conversationState,
            leadContext,
            projects,
            actionHint,
        });

        const llmMessages = [{ role: "system", content: system }];

        for (const entry of history) {
            llmMessages.push({
                role: entry.role === "assistant" ? "assistant" : "user",
                content: entry.content,
            });
        }

        llmMessages.push({ role: "user", content: user });

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "AI Lead Orchestrator",
            },
            body: JSON.stringify({
                model: this.model,
                response_format: { type: "json_object" },
                messages: llmMessages,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error("LLM request failed");
            error.status = response.status;
            error.details = data;
            throw error;
        }

        const content = data.choices?.[0]?.message?.content;
        const parsed = parseLlmJson(content);
        const normalized = normalizeAssistantResponse(parsed);

        if (!ConversationStateSchema.safeParse(normalized.conversationState).success) {
            normalized.conversationState = conversationState;
        }

        if (!NextActionSchema.safeParse(normalized.nextAction).success) {
            normalized.nextAction = "continue_conversation";
        }

        return AssistantResponseSchema.parse(normalized);
    }
}
