(function (window, document) {
    "use strict";

    const STYLES = `
        :host {
            display: block;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            line-height: 1.5;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        .widget {
            max-width: 520px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }

        .widget-header {
            padding: 24px 24px 0;
        }

        .widget-header h2 {
            margin: 0 0 8px;
            font-size: 1.35rem;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .widget-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.95rem;
        }

        .widget-body {
            padding: 24px;
        }

        .field {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #334155;
        }

        input, textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            font: inherit;
            background: #f8fafc;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            background: #fff;
        }

        textarea {
            min-height: 120px;
            resize: vertical;
        }

        .submit-btn {
            width: 100%;
            margin-top: 8px;
            padding: 12px 16px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: #fff;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.15s, transform 0.1s;
        }

        .submit-btn:hover:not(:disabled) {
            opacity: 0.95;
        }

        .submit-btn:active:not(:disabled) {
            transform: translateY(1px);
        }

        .submit-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }

        .status {
            margin-top: 16px;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.9rem;
        }

        .status-error {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        .status-loading {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid #93c5fd;
            border-top-color: #1d4ed8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            flex-shrink: 0;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .results {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }

        .results h3 {
            margin: 0 0 14px;
            font-size: 1rem;
            font-weight: 700;
        }

        .metrics {
            display: grid;
            gap: 10px;
            margin-bottom: 16px;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            background: #f8fafc;
            border-radius: 10px;
            font-size: 0.9rem;
        }

        .metric-label {
            color: #64748b;
            font-weight: 500;
        }

        .metric-value {
            font-weight: 600;
            text-align: right;
        }

        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: capitalize;
        }

        .badge-low { background: #dcfce7; color: #166534; }
        .badge-medium { background: #fef9c3; color: #854d0e; }
        .badge-high { background: #fee2e2; color: #991b1b; }
        .badge-unknown { background: #e2e8f0; color: #475569; }
    `;

    const SCRIPT_MARKER = "data-lead-widget";

    function findEmbedScript() {
        if (document.currentScript) {
            return document.currentScript;
        }

        return document.querySelector(`script[${SCRIPT_MARKER}], script[src*="embed.js"]`);
    }

    function readScriptConfig(script) {
        if (!script) {
            return null;
        }

        const apiUrl = script.getAttribute("data-api-url");

        return {
            apiUrl: apiUrl ? apiUrl.replace(/\/$/, "") : "",
            targetId: script.getAttribute("data-target") || "ai-lead-widget",
        };
    }

    function complexityBadgeClass(complexity) {
        const value = (complexity || "unknown").toLowerCase();
        if (value === "low" || value === "medium" || value === "high") {
            return `badge badge-${value}`;
        }
        return "badge badge-unknown";
    }

    function formatIntent(intent) {
        if (!intent || intent === "unknown") {
            return "Unknown";
        }
        return intent.replace(/_/g, " ");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderResults(ai) {
        return `
            <div class="results">
                <h3>AI Analysis</h3>
                <div class="metrics">
                    <div class="metric">
                        <span class="metric-label">Intent</span>
                        <span class="metric-value">${escapeHtml(formatIntent(ai.intent))}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Complexity</span>
                        <span class="metric-value">
                            <span class="${complexityBadgeClass(ai.complexity)}">${escapeHtml(ai.complexity || "unknown")}</span>
                        </span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Estimated cost</span>
                        <span class="metric-value">${escapeHtml(ai.estimatedCost || "Unknown")}</span>
                    </div>
                </div>
            </div>
        `;
    }

    class LeadWidget {
        constructor(container, apiUrl) {
            this.container = container;
            this.apiUrl = apiUrl;
            this.shadow = container.attachShadow({ mode: "open" });
            this.render();
            this.bindEvents();
        }

        render() {
            const style = document.createElement("style");
            style.textContent = STYLES;

            const wrapper = document.createElement("div");
            wrapper.className = "widget";
            wrapper.innerHTML = `
                <div class="widget-header">
                    <h2>Project inquiry</h2>
                    <p>Describe your project and get an instant AI-powered estimate.</p>
                </div>
                <div class="widget-body">
                    <form class="lead-form" novalidate>
                        <div class="field">
                            <label for="email">Email</label>
                            <input id="email" name="email" type="email" required placeholder="you@company.com" autocomplete="email" />
                        </div>
                        <div class="field">
                            <label for="company">Company <span style="font-weight:400;color:#94a3b8">(optional)</span></label>
                            <input id="company" name="company" type="text" placeholder="Acme Inc." autocomplete="organization" />
                        </div>
                        <div class="field">
                            <label for="message">Project details</label>
                            <textarea id="message" name="message" required placeholder="Tell us what you want to build, timeline, and any constraints..."></textarea>
                        </div>
                        <button type="submit" class="submit-btn">Analyze request</button>
                    </form>
                    <div class="status-area" hidden></div>
                </div>
            `;

            this.shadow.appendChild(style);
            this.shadow.appendChild(wrapper);

            this.form = this.shadow.querySelector(".lead-form");
            this.submitBtn = this.shadow.querySelector(".submit-btn");
            this.statusArea = this.shadow.querySelector(".status-area");
        }

        bindEvents() {
            this.form.addEventListener("submit", (event) => {
                event.preventDefault();
                this.submit();
            });
        }

        setStatus(type, message) {
            this.statusArea.hidden = false;
            this.statusArea.className = "status-area";

            if (type === "loading") {
                this.statusArea.innerHTML = `
                    <div class="status status-loading">
                        <span class="spinner" aria-hidden="true"></span>
                        <span>${escapeHtml(message)}</span>
                    </div>
                `;
                return;
            }

            if (type === "error") {
                this.statusArea.innerHTML = `<div class="status status-error">${escapeHtml(message)}</div>`;
            }
        }

        clearResults() {
            const existing = this.shadow.querySelector(".results");
            if (existing) {
                existing.remove();
            }
        }

        async submit() {
            const email = this.shadow.querySelector("#email").value.trim();
            const company = this.shadow.querySelector("#company").value.trim();
            const message = this.shadow.querySelector("#message").value.trim();

            if (!email) {
                this.setStatus("error", "Please enter your email address.");
                return;
            }

            if (!message) {
                this.setStatus("error", "Please describe your project.");
                return;
            }

            this.submitBtn.disabled = true;
            this.clearResults();
            this.setStatus("loading", "Analyzing your request — this may take up to a minute...");

            try {
                const response = await fetch(`${this.apiUrl}/api/leads`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        company: company || null,
                        message,
                    }),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const errorMessage =
                        data.message || data.error || "Failed to analyze your request. Please try again.";
                    this.setStatus("error", errorMessage);
                    return;
                }

                this.statusArea.hidden = true;

                const body = this.shadow.querySelector(".widget-body");
                body.insertAdjacentHTML("beforeend", renderResults(data.ai || {}));
            } catch {
                this.setStatus("error", "Network error. Please check your connection and try again.");
            } finally {
                this.submitBtn.disabled = false;
            }
        }
    }

    function mount(config) {
        const targetId = config.targetId || config.target || "ai-lead-widget";
        const apiUrl = (config.apiUrl || "").replace(/\/$/, "");

        if (!apiUrl) {
            console.error("[LeadWidget] data-api-url is required on the embed script tag.");
            return null;
        }

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

        if (!config) {
            return;
        }

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
