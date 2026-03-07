const express = require("express");
const OpenAI = require("openai");
const crypto = require("crypto");
const { executeTool } = require("./toolExecutor");

const app = express();
const S2S_SECRET = process.env.BDF_S2S_SECRET;

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf?.toString("utf8") || "";
  }
}));
function timingSafeEqualHex(a, b) {
  const ba = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifyS2S(req, res, next) {
  if (req.path === "/health") return next();

  if (!S2S_SECRET) {
    return res.status(500).json({ error: "Server misconfigured: missing BDF_S2S_SECRET" });
  }

  const ts = req.header("X-BDF-Timestamp");
  const sig = req.header("X-BDF-Signature");

  if (!ts || !sig) return res.status(401).json({ error: "Missing signature headers" });

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return res.status(401).json({ error: "Invalid timestamp" });

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > 300) return res.status(401).json({ error: "Timestamp expired" });

  const rawBody = req.rawBody || "";
  const expected = crypto
    .createHmac("sha256", S2S_SECRET)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  if (!timingSafeEqualHex(expected, sig)) return res.status(401).json({ error: "Invalid signature" });

  next();
}

app.use(verifyS2S);
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

if (!endpoint || !apiKey || !deployment) {
  console.warn("Missing env vars: AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT");
}

const client = new OpenAI({
  apiKey,
  baseURL: `${endpoint}/openai/deployments/${deployment}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": apiKey },
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required (string)" });
    }
    let toolData = null;

    if (message.toLowerCase().includes("portfolio") ||
      message.toLowerCase().includes("investment")) {
      toolData = await executeTool("get_investment_overview", userId);
    }

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are BulldogFinance assistant. Be accurate, cautious, and helpful." },
        { role: "user", content: message },
        toolData
          ? {
            role: "system",
            content: `Investment overview data: ${JSON.stringify(toolData)}`
          }
          : null
      ].filter(Boolean),
      temperature: 0.3,
      max_tokens: 600,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";
    return res.json({ reply });
  } catch (e) {
    console.error("OpenAI error:", e?.message || e);
    return res.status(500).json({ error: "chat failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MCP server listening on :${port}`));
