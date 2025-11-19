const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

app.use(express.json());

// Serve static files (like index.html)
app.use(express.static(ROOT_DIR));

// Root route -> send index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

// /api/ai -> Groq
app.post("/api/ai", async (req, res) => {
  const { age, severity, duration, symptoms } = req.body;

  const userSummary = `
Age: ${age || "not given"}
Severity: ${severity || "not given"}
Duration (days): ${duration || "not given"}
Symptoms: ${symptoms || "not given"}
`.trim();

  const systemMessage = `
You are an AI health information assistant for a SCHOOL PROJECT.
Rules:
- DO NOT prescribe any medicine names.
- DO NOT give any dosage amounts.
- Only give general information, simple self-care tips, and signs when to see a doctor.
- Always remind the user to consult a real doctor for any medical decision.
`.trim();

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemMessage },
          {
            role: "user",
            content:
              `Here are the details:\n${userSummary}\n\n` +
              `Give a short explanation of possible simple causes, basic self-care tips, ` +
              `and when they should see a doctor. Remember: no medicines, no dosages.`
          }
        ]
      })
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      console.error("Groq API error:", text);
      return res.status(500).json({ error: "Groq API error" });
    }

    const data = await groqRes.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "AI did not return a message.";

    res.json({ reply });
  } catch (err) {
    console.error("Server error talking to Groq:", err);
    res.status(500).json({ error: "Server error talking to Groq" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
