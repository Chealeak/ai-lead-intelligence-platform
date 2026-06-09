import express from "express";
import dotenv from "dotenv";
import { LeadAnalyzer } from "./src/LeadAnalyzer.js";

dotenv.config();

const app = express();
const leadAnalyzer = new LeadAnalyzer();

app.use(express.json());

app.post("/analyze", async (req, res) => {
    const { message } = req.body ?? {};

    if (!message) {
        return res.status(400).json({ error: "message is required" });
    }

    try {
        const result = await leadAnalyzer.analyze(message);
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
