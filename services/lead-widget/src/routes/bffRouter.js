import { Router } from "express";
import {
    BackendLeadResponseSchema,
    LeadCreateRequestSchema,
} from "@ai-lead-intelligence/shared/contracts/lead.schema.js";
import {
    safeParse,
    toBffErrorResponse,
    toBffLeadResponse,
} from "@ai-lead-intelligence/shared/utils";

export function createBffRouter({ backendUrl, internalServiceSecret = "" }) {
    const router = Router();
    const baseUrl = backendUrl.replace(/\/$/, "");

    router.post("/api/leads", async (req, res) => {
        const parsedRequest = safeParse(LeadCreateRequestSchema, req.body ?? {});

        if (!parsedRequest.success) {
            return res.status(400).json(toBffErrorResponse(parsedRequest.message));
        }

        const { email, company, message } = parsedRequest.data;

        try {
            const response = await fetch(`${baseUrl}/api/leads`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(internalServiceSecret
                        ? {
                              "X-Internal-Service-Secret": internalServiceSecret,
                              "X-Widget-Client-Ip": req.ip,
                          }
                        : {}),
                },
                body: JSON.stringify({
                    email,
                    company: company ?? null,
                    message,
                }),
                signal: AbortSignal.timeout(65000),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.headers.has("retry-after")) {
                    res.set("Retry-After", response.headers.get("retry-after"));
                }
                return res.status(response.status).json(
                    toBffErrorResponse(
                        data.message || data.error || "Failed to analyze your request."
                    )
                );
            }

            const parsedBackend = safeParse(BackendLeadResponseSchema, data);

            if (!parsedBackend.success) {
                console.error("Unexpected backend response:", parsedBackend.message, data);

                return res.status(502).json(
                    toBffErrorResponse("Unexpected response from backend service.")
                );
            }

            return res.status(response.status).json(toBffLeadResponse(parsedBackend.data));
        } catch (error) {
            if (error.name === "TimeoutError") {
                return res.status(504).json(
                    toBffErrorResponse("Analysis timed out. Please try again.")
                );
            }

            console.error("BFF lead proxy failed:", error);

            return res.status(502).json(toBffErrorResponse("Backend service unavailable"));
        }
    });

    return router;
}
