import { ProjectReferenceService } from "./ProjectReferenceService.js";

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
        `Name: ${project.name}`,
        `Description: ${project.description}`,
        `Industry: ${project.industry ?? "n/a"}`,
        `Budget: ${budget}`,
        `Duration: ${project.durationMonths ?? "n/a"} months`,
        `Team size: ${project.teamSize ?? "n/a"}`,
        `Tags: ${tags}`,
    ].join("\n");
}

export class LeadAnalyzer {
    constructor({
        projectReferenceService = new ProjectReferenceService(),
        apiKey = process.env.OPENROUTER_API_KEY,
        model = "openai/gpt-4o-mini",
    } = {}) {
        this.projectReferenceService = projectReferenceService;
        this.apiKey = apiKey;
        this.model = model;
    }

    buildPrompt(message, projects) {
        const referencesBlock =
            projects.length > 0
                ? projects.map((project) => formatProjectReference(project)).join("\n\n")
                : "No past project references available.";

        const system = [
            "You are a senior lead qualification assistant for a software development agency.",
            "Your task is to analyze incoming client requests and produce structured JSON for sales estimation.",
            "",
            "Use the provided past project references as context for similarity matching and cost estimation.",
            "",
            "Return ONLY valid JSON.",
            "",
            "Top-level keys:",
            "- intent (string): inferred type of project (e.g. 'ai_chatbot', 'crm_integration', 'cloud_migration')",
            "- complexity (low|medium|high): technical complexity estimation",
            "- estimatedCost (string): price range in USD (e.g. '12000-18000 USD')",
            "- similarProjects (array): most relevant past projects",
            "",
            "similarProjects must contain objects with:",
            "- id (number)",
            "- reason (string, 1-2 sentences explaining why this project matches the lead)",
            "",
            "Rules:",
            "- Only use id from provided references",
            "- Do NOT invent projects",
            "- Keep reason concise and factual",
            "- Select max 3 similar projects",
        ].join(" ");

        const user = [
            "Lead inquiry:",
            message,
            "",
            "Past project references:",
            referencesBlock,
        ].join("\n");

        return { system, user };
    }

    async analyze(message) {
        if (!this.apiKey) {
            throw new Error("OPENROUTER_API_KEY is not configured");
        }

        const projects = await this.projectReferenceService.getProjects();
        const { system, user } = this.buildPrompt(message, projects);

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
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
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

        return {
            intent: parsed.intent ?? "unknown",
            complexity: parsed.complexity ?? "unknown",
            estimatedCost: parsed.estimatedCost ?? "unknown",
            similarProjects: Array.isArray(parsed.similarProjects)
                ? parsed.similarProjects.map(p => ({
                    id: p.id,
                    reason: p.reason,
                }))
                : [],
        };
    }
}
