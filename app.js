require("dotenv").config();
const express = require("express");
const crypto = require("crypto");

const app = express();

// We need the raw body for signature verification.
// This middleware stores the raw buffer on req.rawBody and also parses JSON.
app.use((req, res, next) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    req.rawBody = raw;
    try {
      // Try to parse as JSON (if content-type application/json)
      if (raw.length) req.body = JSON.parse(raw.toString("utf8"));
      else req.body = {};
    } catch (err) {
      // if parsing fails, keep body as empty object
      req.body = {};
    }
    next();
  });
});

const PORT = process.env.PORT || 3000;
const RETELL_API_KEY = process.env.RETELL_API_KEY || ""; // used as HMAC secret
if (!RETELL_API_KEY) console.warn("WARNING: RETELL_API_KEY not set");

const accountMap = {
  [process.env.RETELL_AGENT_1 || "retell-agent-123"]: {
    apiKey: process.env.TEXTABLE_API_KEY_1 || "",
    fromNumber: process.env.TEXTABLE_FROM_1 || "+16660001111",
  },
  [process.env.RETELL_AGENT_2 || "retell-agent-456"]: {
    apiKey: process.env.TEXTABLE_API_KEY_2 || "",
    fromNumber: process.env.TEXTABLE_FROM_2 || "+16660002222",
  },
};

function verifyRetellSignature(req) {
  const signature = (req.headers["x-retell-signature"] || "").trim();
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", RETELL_API_KEY);
  hmac.update(req.rawBody || Buffer.from([]));
  const expected = hmac.digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

app.post("/retell-function", async (req, res) => {
  try {
    // Verify signature
    if (!verifyRetellSignature(req)) {
      console.warn("Invalid Retell signature. Headers:", req.headers);
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { name, call = {}, args = {} } = req.body || {};
    console.log("Received Retell function call:", name);
    console.log("call:", JSON.stringify(call));
    console.log("args:", JSON.stringify(args));

    if (name !== "send_textable_sms") {
      return res.status(400).json({ error: "Unknown function name" });
    }

    const agentId = call.agent_id || call.agentId || call.agent?.id;
    if (!agentId) {
      console.warn("No agent id in call context:", call);
      return res.status(400).json({ error: "Missing agent id" });
    }

    const account = accountMap[agentId];
    if (!account || !account.apiKey) {
      console.warn("Unknown agent or missing account config for:", agentId);
      return res.status(400).json({ error: "Unknown agent ID or missing Textable credentials" });
    }

    const toNumber = args.toNumber || args.to || args.phone;
    const messageBody = args.messageBody || args.body || args.message;
    if (!toNumber || !messageBody) {
      return res.status(400).json({ error: "Missing toNumber or messageBody" });
    }

    // Build Textable API request
    const textableUrl = process.env.TEXTABLE_API_URL || "https://onesms-txb.textable.app/api/messages";

    const payload = {
      toNumber,
      fromNumber: account.fromNumber,
      messageBody,
      // add extras if needed, e.g. conversationId: args.conversationId
    };

    console.log("Sending to Textable:", payload);

    const txtRes = await fetch(textableUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const txtBody = await txtRes.text();
    let txtJson;
    try {
      txtJson = JSON.parse(txtBody);
    } catch (e) {
      txtJson = { raw: txtBody };
    }

    if (!txtRes.ok) {
      console.error("Textable API returned error:", txtRes.status, txtJson);
      return res.status(500).json({ error: "Textable API error", details: txtJson });
    }

    console.log("Textable success:", txtJson);
    res.json({ success: true, textable: txtJson });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.get("/", (req, res) => res.send("Retell -> Textable middleware OK"));

app.listen(PORT, () => {
  console.log(`Middleware listening on port ${PORT}`);
});
