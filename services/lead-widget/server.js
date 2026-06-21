import express from "express";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBffRouter } from "./src/routes/bffRouter.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3001;
const backendUrl = process.env.BACKEND_URL || process.env.API_URL || "http://localhost:8080";
const widgetUrl = process.env.WIDGET_URL || `http://localhost:${port}`;

const embedScript = readFileSync(join(__dirname, "src", "embed.js"), "utf8");

app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.options("/api/leads", (_req, res) => {
    res.sendStatus(204);
});

app.use(express.json());
app.use(createBffRouter({ backendUrl }));

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
