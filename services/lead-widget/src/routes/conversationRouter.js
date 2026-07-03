import { Router } from "express";
import {
    BackendConversationResponseSchema,
    ConversationCreateRequestSchema,
    ConversationMessageRequestSchema,
} from "@ai-lead-intelligence/shared/contracts/conversation.schema.js";
import {
    safeParse,
    toBffConversationResponse,
    toBffErrorResponse,
} from "@ai-lead-intelligence/shared/utils";

export function createConversationRouter({ backendUrl }) {
    const router = Router();
    const baseUrl = backendUrl.replace(/\/$/, "");

    router.post("/api/conversations", async (req, res) => {
        const parsedRequest = safeParse(ConversationCreateRequestSchema, req.body ?? {});

        if (!parsedRequest.success) {
            return res.status(400).json(toBffErrorResponse(parsedRequest.message));
        }

        try {
            const response = await fetch(`${baseUrl}/api/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedRequest.data),
                signal: AbortSignal.timeout(65000),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return res.status(response.status).json(
                    toBffErrorResponse(data.error || data.message || "Failed to start conversation.")
                );
            }

            const parsedBackend = safeParse(BackendConversationResponseSchema, data);

            if (!parsedBackend.success) {
                console.error("Unexpected backend conversation response:", parsedBackend.message, data);
                return res.status(502).json(toBffErrorResponse("Unexpected response from backend service."));
            }

            return res.status(response.status).json(toBffConversationResponse(parsedBackend.data));
        } catch (error) {
            console.error("BFF conversation create failed:", error);
            return res.status(502).json(toBffErrorResponse("Backend service unavailable"));
        }
    });

    router.get("/api/conversations/:id", async (req, res) => {
        try {
            const response = await fetch(`${baseUrl}/api/conversations/${req.params.id}`, {
                signal: AbortSignal.timeout(30000),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return res.status(response.status).json(
                    toBffErrorResponse(data.error || data.message || "Conversation not found.")
                );
            }

            const parsedBackend = safeParse(BackendConversationResponseSchema, data);

            if (!parsedBackend.success) {
                return res.status(502).json(toBffErrorResponse("Unexpected response from backend service."));
            }

            return res.json(toBffConversationResponse(parsedBackend.data));
        } catch (error) {
            console.error("BFF conversation fetch failed:", error);
            return res.status(502).json(toBffErrorResponse("Backend service unavailable"));
        }
    });

    router.post("/api/conversations/:id/messages", async (req, res) => {
        const parsedRequest = safeParse(ConversationMessageRequestSchema, req.body ?? {});

        if (!parsedRequest.success) {
            return res.status(400).json(toBffErrorResponse(parsedRequest.message));
        }

        try {
            const response = await fetch(`${baseUrl}/api/conversations/${req.params.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedRequest.data),
                signal: AbortSignal.timeout(90000),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return res.status(response.status).json(
                    toBffErrorResponse(data.error || data.message || "Failed to send message.")
                );
            }

            const parsedBackend = safeParse(BackendConversationResponseSchema, data);

            if (!parsedBackend.success) {
                console.error("Unexpected backend message response:", parsedBackend.message, data);
                return res.status(502).json(toBffErrorResponse("Unexpected response from backend service."));
            }

            return res.json(toBffConversationResponse(parsedBackend.data));
        } catch (error) {
            if (error.name === "TimeoutError") {
                return res.status(504).json(toBffErrorResponse("Assistant response timed out. Please try again."));
            }

            console.error("BFF conversation message failed:", error);
            return res.status(502).json(toBffErrorResponse("Backend service unavailable"));
        }
    });

    return router;
}
