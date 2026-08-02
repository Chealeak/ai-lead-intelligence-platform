import express from "express";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBffRouter } from "./src/routes/bffRouter.js";
import { createConversationRouter } from "./src/routes/conversationRouter.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3001;
const backendUrl = process.env.BACKEND_URL || process.env.API_URL || "http://localhost:8080";
const widgetUrl = process.env.WIDGET_URL || `http://localhost:${port}`;
const internalServiceSecret = process.env.INTERNAL_SERVICE_SECRET || "";
const trustedProxies = (process.env.WIDGET_TRUSTED_PROXIES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

if (trustedProxies.length > 0) {
    app.set("trust proxy", trustedProxies);
}

const embedScript = readFileSync(join(__dirname, "src", "embed.js"), "utf8");
const rateWindows = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, window] of rateWindows) {
        if (window.resetAt <= now) rateWindows.delete(key);
    }
}, 60_000).unref();

function rateLimit({ name, limit, key = (req) => req.ip }) {
    const intervalMs = 60_000;

    return (req, res, next) => {
        const now = Date.now();
        const windowKey = `${name}:${key(req)}`;
        const current = rateWindows.get(windowKey);
        const window = !current || current.resetAt <= now
            ? { count: 0, resetAt: now + intervalMs }
            : current;

        window.count += 1;
        rateWindows.set(windowKey, window);

        if (window.count > limit) {
            return res
                .set("Retry-After", String(Math.max(1, Math.ceil((window.resetAt - now) / 1000))))
                .status(429)
                .json({ success: false, message: "Too many requests. Please try again later." });
        }

        next();
    };
}

app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.options(["/api/leads", "/api/conversations", "/api/conversations/:id/messages"], (_req, res) => {
    res.sendStatus(204);
});

app.use(express.json());
app.post("/api/leads", rateLimit({ name: "lead", limit: 5 }));
app.post("/api/conversations", rateLimit({ name: "conversation-create", limit: 10 }));
app.post(
    "/api/conversations/:id/messages",
    rateLimit({ name: "conversation-message-ip", limit: 30 }),
    rateLimit({
        name: "conversation-message",
        limit: 20,
        key: (req) => req.params.id,
    })
);
app.use(createBffRouter({ backendUrl, internalServiceSecret }));
app.use(createConversationRouter({ backendUrl, internalServiceSecret }));

app.get("/embed.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(embedScript);
});

app.get("/demo", (_req, res) => {
    const demoHtml = readFileSync(join(__dirname, "public", "demo.html"), "utf8");
    const rendered = demoHtml.replaceAll("{{WIDGET_URL}}", widgetUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(rendered);
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`Lead widget service running on port ${port}`);
});
