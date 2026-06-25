export class ProjectReferenceService {
    constructor(baseUrl = process.env.BACKEND_URL ?? "http://nginx") {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    async getProjects() {
        const response = await fetch(`${this.baseUrl}/api/project-references`);

        if (!response.ok) {
            throw new Error(`Failed to fetch project references: ${response.status}`);
        }

        return response.json();
    }

    async searchSimilar(query, limit = 5) {
        const response = await fetch(`${this.baseUrl}/api/project-references/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit }),
        });

        if (!response.ok) {
            throw new Error(`Failed to search project references: ${response.status}`);
        }

        return response.json();
    }
}
