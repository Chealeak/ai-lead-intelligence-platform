import express from "express";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3001;
const apiUrl = process.env.API_URL || "http://localhost:8080";

const embedScript = readFileSync(join(__dirname, "src", "embed.js"), "utf8");

app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/embed.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(embedScript);
});

app.get("/demo", (_req, res) => {
    const demoHtml = readFileSync(join(__dirname, "public", "demo.html"), "utf8");
    const rendered = demoHtml.replaceAll("{{API_URL}}", apiUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(rendered);
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`Lead widget service running on port ${port}`);
});
