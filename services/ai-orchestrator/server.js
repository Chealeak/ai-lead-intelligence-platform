import express from "express";
import dotenv from "dotenv";
import { AnalyzeRequestSchema } from "@ai-lead-intelligence/shared/contracts/lead.schema.js";
import { safeParse } from "@ai-lead-intelligence/shared/utils";
import { LeadAnalyzer } from "./src/LeadAnalyzer.js";

dotenv.config();

const app = express();
const leadAnalyzer = new LeadAnalyzer();

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

app.listen(3000, () => {
    console.log("AI orchestrator running on port 3000");
});
