import { Router } from "express";

function transformLeadResponse(data) {
    return {
        success: true,
        analysis: {
            intent: data.ai?.intent ?? null,
            complexity: data.ai?.complexity ?? null,
            estimatedCost: data.ai?.estimatedCost ?? null,
            projects: data.ai?.similarProjects ?? [],
        },
    };
}

export function createBffRouter({ backendUrl }) {
    const router = Router();
    const baseUrl = backendUrl.replace(/\/$/, "");

    router.post("/api/leads", async (req, res) => {
        const { email, company, message } = req.body ?? {};

        if (!email?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "email and message are required",
            });
        }

        try {
            const response = await fetch(`${baseUrl}/api/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    company: company?.trim() || null,
                    message: message.trim(),
                }),
                signal: AbortSignal.timeout(65000),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return res.status(response.status).json({
                    success: false,
                    message: data.message || data.error || "Failed to analyze your request.",
                });
            }

            return res.status(response.status).json(transformLeadResponse(data));
        } catch (error) {
            if (error.name === "TimeoutError") {
                return res.status(504).json({
                    success: false,
                    message: "Analysis timed out. Please try again.",
                });
            }

            console.error("BFF lead proxy failed:", error);

            return res.status(502).json({
                success: false,
                message: "Backend service unavailable",
            });
        }
    });

    return router;
}
