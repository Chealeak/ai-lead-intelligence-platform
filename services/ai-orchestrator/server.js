import express from "express";

const app = express();

app.use(express.json());

app.post("/analyze", async (req, res) => {
    const { message } = req.body;

    let complexity = "low";

    if (message?.length > 100) {
        complexity = "medium";
    }

    res.json({
        intent: "website_development",
        complexity,
        estimatedCost: "5000-10000 USD"
    });
});

app.listen(3000, () => {
    console.log("AI orchestrator running on port 3000");
});