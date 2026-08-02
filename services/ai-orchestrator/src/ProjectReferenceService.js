export class ProjectReferenceService {
    constructor(baseUrl = process.env.BACKEND_URL ?? "http://nginx") {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.internalServiceSecret = process.env.INTERNAL_SERVICE_SECRET ?? "";
    }

    async getProjects() {
        const response = await fetch(`${this.baseUrl}/api/project-references`, {
            headers: this.#authHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch project references: ${response.status}`);
        }

        return response.json();
    }

    async searchSimilar(query, limit = 5) {
        const response = await fetch(`${this.baseUrl}/api/project-references/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...this.#authHeaders(),
            },
            body: JSON.stringify({ query, limit }),
        });

        if (!response.ok) {
            throw new Error(`Failed to search project references: ${response.status}`);
        }

        return response.json();
    }

    #authHeaders() {
        if (!this.internalServiceSecret) {
            throw new Error("Internal service authentication is not configured");
        }

        return { "X-Internal-Service-Secret": this.internalServiceSecret };
    }
}
