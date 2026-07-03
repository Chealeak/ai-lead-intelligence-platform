import express from "express";
import dotenv from "dotenv";
import { AnalyzeRequestSchema } from "@ai-lead-intelligence/shared/contracts/lead.schema.js";
import { ChatRequestSchema } from "@ai-lead-intelligence/shared/contracts/conversation.schema.js";
import { safeParse } from "@ai-lead-intelligence/shared/utils";
import { LeadAnalyzer } from "./src/LeadAnalyzer.js";
import { ConversationAssistant } from "./src/ConversationAssistant.js";

dotenv.config();

const app = express();
const leadAnalyzer = new LeadAnalyzer();
const conversationAssistant = new ConversationAssistant();

app.use(express.json());

app.post("/analyze", async (req, res) => {
    const parsedRequest = safeParse(AnalyzeRequestSchema, req.body ?? {});

    if (!parsedRequest.success) {
        return res.status(400).json({ error: parsedRequest.message });
    }

    try {
        const result = await leadAnalyzer.analyze(parsedRequest.data.message);
        return res.json(result);
    } catch (error) {
        if (error.message === "OPENROUTER_API_KEY is not configured") {
            return res.status(500).json({ error: error.message });
        }

        if (error.message === "LLM request failed") {
            console.error("OpenRouter error:", error.status, error.details);
            return res.status(502).json({
                error: error.message,
                details: error.details,
            });
        }

        console.error("Analyze failed:", error);
        return res.status(500).json({ error: "Failed to analyze message" });
    }
});

app.post("/chat", async (req, res) => {
    const parsedRequest = safeParse(ChatRequestSchema, req.body ?? {});

    if (!parsedRequest.success) {
        return res.status(400).json({ error: parsedRequest.message });
    }

    try {
        const result = await conversationAssistant.chat(parsedRequest.data);
        return res.json(result);
    } catch (error) {
        if (error.message === "OPENROUTER_API_KEY is not configured") {
            return res.status(500).json({ error: error.message });
        }

        if (error.message === "LLM request failed") {
            console.error("OpenRouter chat error:", error.status, error.details);
            return res.status(502).json({
                error: error.message,
                details: error.details,
            });
        }

        console.error("Chat failed:", error);
        return res.status(500).json({ error: "Failed to process conversation message" });
    }
});

app.listen(3000, () => {
    console.log("AI orchestrator running on port 3000");
});
