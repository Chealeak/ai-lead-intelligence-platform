import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

function parseLlmJson(content) {
    if (!content || typeof content !== "string") {
        throw new Error("Empty LLM response content");
    }

    const trimmed = content.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const jsonText = fenced ? fenced[1] : trimmed;

    return JSON.parse(jsonText);
}

app.post("/analyze", async (req, res) => {
    const { message } = req.body ?? {};

    if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured" });
    }

    if (!message) {
        return res.status(400).json({ error: "message is required" });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "AI Lead Orchestrator",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content:
                            "Analyze the lead inquiry. Return JSON with keys: intent (string), complexity (low|medium|high), estimatedCost (string price range in USD).",
                    },
                    {
                        role: "user",
                        content: message,
                    },
                ],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter error:", response.status, data);
            return res.status(502).json({
                error: "LLM request failed",
                details: data,
            });
        }

        const content = data.choices?.[0]?.message?.content;
        const parsed = parseLlmJson(content);

        return res.json({
            intent: parsed.intent ?? "unknown",
            complexity: parsed.complexity ?? "unknown",
            estimatedCost: parsed.estimatedCost ?? parsed.estimated_cost ?? "unknown",
        });
    } catch (error) {
        console.error("Analyze failed:", error);
        return res.status(500).json({ error: "Failed to analyze message" });
    }
});

app.listen(3000, () => {
    console.log("AI orchestrator running on port 3000");
});
