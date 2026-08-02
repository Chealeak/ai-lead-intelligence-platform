(function (window, document) {
    "use strict";

    const STORAGE_KEY = "ai-lead-conversation-token-v2";

    const STYLES = `
        :host {
            display: block;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            line-height: 1.5;
        }

        *, *::before, *::after { box-sizing: border-box; }

        .widget {
            max-width: 520px;
            height: 640px;
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }

        .widget-header {
            padding: 20px 20px 16px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(180deg, #f8fafc, #ffffff);
        }

        .widget-header h2 {
            margin: 0 0 4px;
            font-size: 1.2rem;
            font-weight: 700;
        }

        .widget-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.875rem;
        }

        .lead-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
        }

        .lead-fields input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font: inherit;
            font-size: 0.85rem;
            background: #fff;
        }

        .chat-log {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8fafc;
        }

        .message {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 14px;
            font-size: 0.92rem;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .message-user {
            align-self: flex-end;
            background: #4f46e5;
            color: #fff;
            border-bottom-right-radius: 4px;
        }

        .message-assistant {
            align-self: flex-start;
            background: #fff;
            color: #0f172a;
            border: 1px solid #e2e8f0;
            border-bottom-left-radius: 4px;
        }

        .estimate-card {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            font-size: 0.85rem;
        }

        .estimate-card strong { display: block; margin-bottom: 4px; }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .action-btn {
            padding: 6px 12px;
            border: 1px solid #c7d2fe;
            border-radius: 999px;
            background: #eef2ff;
            color: #3730a3;
            font: inherit;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
        }

        .action-btn:hover:not(:disabled) {
            background: #e0e7ff;
        }

        .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .composer {
            padding: 14px 16px 16px;
            border-top: 1px solid #e2e8f0;
            background: #fff;
        }

        .composer-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .composer textarea {
            flex: 1;
            min-height: 44px;
            max-height: 120px;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font: inherit;
            resize: none;
            background: #f8fafc;
        }

        .composer textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            background: #fff;
        }

        .send-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: #fff;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

        .send-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }

        .loading {
            align-self: flex-start;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 14px;
            background: #fff;
            border: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.875rem;
        }

        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #cbd5e1;
            border-top-color: #4f46e5;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .error-banner {
            margin: 0 16px 8px;
            padding: 10px 12px;
            border-radius: 10px;
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
            font-size: 0.85rem;
        }
    `;

    const SCRIPT_MARKER = "data-lead-widget";

    function findEmbedScript() {
        if (document.currentScript) return document.currentScript;
        return document.querySelector(`script[${SCRIPT_MARKER}], script[src*="embed.js"]`);
    }

    function getServiceUrl(script) {
        const override = script?.getAttribute("data-api-url");
        if (override) return override.replace(/\/$/, "");

        const src = script?.getAttribute("src");
        if (src) {
            try {
                return new URL(src, window.location.href).origin;
            } catch {
                // fall through
            }
        }

        return window.location.origin;
    }

    function readScriptConfig(script) {
        if (!script) return null;

        return {
            apiUrl: getServiceUrl(script),
            targetId: script.getAttribute("data-target") || "ai-lead-widget",
        };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderEstimateCard(assistant) {
        if (!assistant.estimatedCost && !assistant.complexity) return "";

        return `
            <div class="estimate-card">
                ${assistant.estimatedCost ? `<strong>Estimated cost: ${escapeHtml(assistant.estimatedCost)}</strong>` : ""}
                ${assistant.complexity ? `<span>Complexity: ${escapeHtml(assistant.complexity)}</span>` : ""}
            </div>
        `;
    }

    function renderActions(actions, disabled) {
        if (!Array.isArray(actions) || actions.length === 0) return "";

        const buttons = actions
            .map(
                (action) =>
                    `<button type="button" class="action-btn" data-action="${escapeHtml(action.action)}" ${disabled ? "disabled" : ""}>${escapeHtml(action.label)}</button>`
            )
            .join("");

        return `<div class="actions">${buttons}</div>`;
    }

    class LeadWidget {
        constructor(container, apiUrl) {
            this.container = container;
            this.apiUrl = apiUrl;
            this.conversationId = window.localStorage.getItem(STORAGE_KEY);
            this.loading = false;
            this.messages = [];
            this.suggestedActions = [];

            this.shadow = container.attachShadow({ mode: "open" });
            this.render();
            this.bindEvents();
            this.bootstrap();
        }

        render() {
            const style = document.createElement("style");
            style.textContent = STYLES;

            const wrapper = document.createElement("div");
            wrapper.className = "widget";
            wrapper.innerHTML = `
                <div class="widget-header">
                    <h2>AI Sales Assistant</h2>
                    <p>Describe your project and get estimates, proposals, and next steps.</p>
                    <div class="lead-fields">
                        <input id="email" type="email" placeholder="Email (for proposals)" autocomplete="email" />
                        <input id="company" type="text" placeholder="Company (optional)" autocomplete="organization" />
                    </div>
                </div>
                <div class="error-area" hidden></div>
                <div class="chat-log" aria-live="polite"></div>
                <div class="composer">
                    <div class="composer-row">
                        <textarea id="message" rows="1" placeholder="Type your message..."></textarea>
                        <button type="button" class="send-btn">Send</button>
                    </div>
                </div>
            `;

            this.shadow.appendChild(style);
            this.shadow.appendChild(wrapper);

            this.chatLog = this.shadow.querySelector(".chat-log");
            this.messageInput = this.shadow.querySelector("#message");
            this.sendBtn = this.shadow.querySelector(".send-btn");
            this.errorArea = this.shadow.querySelector(".error-area");
            this.emailInput = this.shadow.querySelector("#email");
            this.companyInput = this.shadow.querySelector("#company");
        }

        bindEvents() {
            this.sendBtn.addEventListener("click", () => this.sendMessage());
            this.messageInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    this.sendMessage();
                }
            });

            this.chatLog.addEventListener("click", (event) => {
                const button = event.target.closest("[data-action]");
                if (!button || this.loading) return;

                const action = button.getAttribute("data-action");
                const label = button.textContent.trim();
                this.sendMessage(label, action);
            });
        }

        async bootstrap() {
            if (this.conversationId) {
                try {
                    await this.loadConversation(this.conversationId);
                    return;
                } catch {
                    window.localStorage.removeItem(STORAGE_KEY);
                }
            }

            await this.startConversation();
        }

        setError(message) {
            if (!message) {
                this.errorArea.hidden = true;
                this.errorArea.textContent = "";
                return;
            }

            this.errorArea.hidden = false;
            this.errorArea.className = "error-banner";
            this.errorArea.textContent = message;
        }

        setLoading(isLoading) {
            this.loading = isLoading;
            this.sendBtn.disabled = isLoading;
            this.messageInput.disabled = isLoading;

            const existing = this.shadow.querySelector(".loading-indicator");
            if (isLoading && !existing) {
                this.chatLog.insertAdjacentHTML(
                    "beforeend",
                    `<div class="loading loading-indicator"><span class="spinner"></span><span>Assistant is thinking...</span></div>`
                );
                this.scrollToBottom();
            } else if (!isLoading && existing) {
                existing.remove();
            }
        }

        scrollToBottom() {
            this.chatLog.scrollTop = this.chatLog.scrollHeight;
        }

        renderMessages() {
            this.chatLog.innerHTML = this.messages
                .map((message) => {
                    const roleClass =
                        message.role === "user" ? "message-user" : "message-assistant";
                    const estimate =
                        message.role === "assistant" && message.metadata
                            ? renderEstimateCard(message.metadata)
                            : "";
                    const actions =
                        message.role === "assistant" && message.showActions
                            ? renderActions(this.suggestedActions, this.loading)
                            : "";

                    return `<div class="message ${roleClass}">${escapeHtml(message.content)}${estimate}${actions}</div>`;
                })
                .join("");

            this.scrollToBottom();
        }

        applyConversationPayload(data) {
            this.conversationId = data.conversationId;
            window.localStorage.setItem(STORAGE_KEY, String(this.conversationId));

            if (data.email) this.emailInput.value = data.email;
            if (data.company) this.companyInput.value = data.company;

            this.messages = (data.messages || []).map((message, index, array) => ({
                role: message.role,
                content: message.content,
                metadata: message.metadata || null,
                showActions:
                    message.role === "assistant" &&
                    index === array.length - 1 &&
                    Array.isArray(data.assistant?.suggestedActions) &&
                    data.assistant.suggestedActions.length > 0,
            }));

            this.suggestedActions = data.assistant?.suggestedActions || [];
            this.renderMessages();
        }

        async startConversation() {
            this.setLoading(true);
            this.setError(null);

            try {
                const response = await fetch(`${this.apiUrl}/api/conversations`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to start conversation.");
                }

                this.applyConversationPayload(data);
            } catch (error) {
                this.setError(error.message || "Unable to start conversation.");
            } finally {
                this.setLoading(false);
            }
        }

        async loadConversation(conversationId) {
            const response = await fetch(
                `${this.apiUrl}/api/conversations/${encodeURIComponent(conversationId)}`
            );
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Conversation not found.");
            }

            this.applyConversationPayload(data);
        }

        async sendMessage(overrideMessage, action) {
            const message = (overrideMessage || this.messageInput.value).trim();

            if (!message || this.loading || !this.conversationId) return;

            this.messageInput.value = "";
            this.setError(null);

            this.messages.push({ role: "user", content: message, metadata: null, showActions: false });
            this.renderMessages();
            this.setLoading(true);

            try {
                const payload = {
                    message,
                    action: action || null,
                    email: this.emailInput.value.trim() || null,
                    company: this.companyInput.value.trim() || null,
                };

                const response = await fetch(
                    `${this.apiUrl}/api/conversations/${encodeURIComponent(this.conversationId)}/messages`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );

                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to send message.");
                }

                this.applyConversationPayload(data);
            } catch (error) {
                this.setError(error.message || "Network error. Please try again.");
            } finally {
                this.setLoading(false);
            }
        }
    }

    function mount(config) {
        const targetId = config.targetId || config.target || "ai-lead-widget";
        const apiUrl = (config.apiUrl || "").replace(/\/$/, "");

        const target =
            typeof config.container === "string"
                ? document.getElementById(config.container)
                : config.container || document.getElementById(targetId);

        if (!target) {
            console.warn(`[LeadWidget] Target element #${targetId} not found.`);
            return null;
        }

        if (target.dataset.leadWidgetMounted === "true") {
            return target.__leadWidgetInstance || null;
        }

        target.dataset.leadWidgetMounted = "true";
        const instance = new LeadWidget(target, apiUrl);
        target.__leadWidgetInstance = instance;

        return instance;
    }

    function autoInit() {
        const script = findEmbedScript();
        const scriptConfig = readScriptConfig(script);
        const config = window.LeadWidgetConfig || scriptConfig;

        if (!config) return;

        mount(config);
    }

    window.LeadWidget = {
        mount,
        init: autoInit,
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoInit);
    } else {
        autoInit();
    }
})(window, document);
