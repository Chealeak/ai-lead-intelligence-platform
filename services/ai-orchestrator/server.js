import express from "express";
import dotenv from "dotenv";
import { createHash, timingSafeEqual } from "node:crypto";
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

const internalWindows = new Map();
const INTERNAL_LIMIT = 120;
const INTERNAL_WINDOW_MS = 60_000;

function secureEqual(expected, provided) {
    if (!expected || !provided) return false;

    const expectedDigest = createHash("sha256").update(expected).digest();
    const providedDigest = createHash("sha256").update(provided).digest();

    return timingSafeEqual(expectedDigest, providedDigest);
}

function requireInternalService(req, res, next) {
    const expected = process.env.INTERNAL_SERVICE_SECRET ?? "";

    if (!expected) {
        console.error("INTERNAL_SERVICE_SECRET is not configured");
        return res.status(503).json({ error: "Service unavailable" });
    }

    if (!secureEqual(expected, req.get("X-Internal-Service-Secret") ?? "")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const current = internalWindows.get(key);
    const window = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + INTERNAL_WINDOW_MS }
        : current;

    window.count += 1;
    internalWindows.set(key, window);

    if (window.count > INTERNAL_LIMIT) {
        return res
            .set("Retry-After", String(Math.max(1, Math.ceil((window.resetAt - now) / 1000))))
            .status(429)
            .json({ error: "Too many requests" });
    }

    next();
}

app.use(["/analyze", "/chat"], requireInternalService);

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
            return res.status(502).json({ error: "AI provider request failed" });
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
            return res.status(502).json({ error: "AI provider request failed" });
        }

        console.error("Chat failed:", error);
        return res.status(500).json({ error: "Failed to process conversation message" });
    }
});

app.listen(3000, () => {
    console.log("AI orchestrator running on port 3000");
});
