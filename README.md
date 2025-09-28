
# Retell AI / Telogix → Textable SMS Middleware

This middleware connects an AI voice/chat agent (via **Retell AI / Telogix**) to the **Textable SMS API**.
When an agent calls a custom function (e.g., `send_textable_sms`), the request is routed through this middleware, which sends the SMS using the correct customer’s Textable account and phone number.

---

## 🚀 Architecture

```
AI Agent (Retell / Telogix)
        │
        ▼
 Custom Function (POST webhook)
        │
        ▼
 Middleware (Node.js / Express)
        │
        ▼
 Textable API → SMS Sent & Logged
```

---

## ⚙️ Prerequisites

* Node.js v18+
* [ngrok](https://ngrok.com/) (for local testing)
* API keys & phone numbers from your **Textable** accounts
* Agent IDs from **Retell AI / Telogix**
* Retell API Key (used for verifying webhook signatures)

---

## 📦 Installation

```bash
git clone <this-repo>
cd <repo-folder>
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file:

```ini
PORT=3000

# Retell AI webhook secret (HMAC key)
RETELL_API_KEY=your_retell_hmac_secret_here

# Map Retell/Telogix Agent IDs to Textable credentials
RETELL_AGENT_1=retell-agent-123
TEXTABLE_API_KEY_1=your_textable_api_key_for_customer_1
TEXTABLE_FROM_1=+13333333333

RETELL_AGENT_2=retell-agent-456
TEXTABLE_API_KEY_2=your_textable_api_key_for_customer_2
TEXTABLE_FROM_2=+14444444444

# Optional override
# TEXTABLE_API_URL=https://onesms-txb.textable.app/api/messages
```

---

## ▶️ Run Locally

```bash
node app.js
```

Expose with ngrok:

```bash
ngrok http 3000
```

Copy the ngrok URL, e.g.
`https://abc123.ngrok.io/retell-function`

---

## 🔌 Configure Custom Function in Retell / Telogix

1. Log in to [Telogix AI Dashboard](https://ai.telogix.com/)

2. Add a new **Custom Function**:

   * **Name:** `send_textable_sms`
   * **Method:** `POST`
   * **URL:** `https://<your-ngrok-url>/retell-function`
   * **Schema:**

     ```json
     {
       "type": "object",
       "properties": {
         "toNumber": { "type": "string" },
         "messageBody": { "type": "string" }
       },
       "required": ["toNumber", "messageBody"]
     }
     ```

3. Save and assign the function to your AI agent.

---

## 📡 Example Function Call

When the agent calls:

```json
{
  "name": "send_textable_sms",
  "args": {
    "toNumber": "+15552223333",
    "messageBody": "Hello from Retell/Telogix!"
  }
}
```

The middleware will forward:

```json
{
  "toNumber": "+15552223333",
  "fromNumber": "+13333333333",
  "messageBody": "Hello from Retell/Telogix!"
}
```

to the Textable API.

---

## ✅ Success Response

The middleware returns:

```json
{
  "success": true,
  "textable": {
    "MessageID": "abc123xyz",
    "ConversationID": "xyz321cba",
    "MessageDirection": "out",
    "MessageBody": "Hello from Retell/Telogix!"
  }
}
```

---

## 🛠 Debugging

* **Signature Errors:** Check that `RETELL_API_KEY` matches your Retell secret.
* **Unknown Agent ID:** Ensure the agent ID is listed in `.env`.
* **Textable API Errors:** Verify `TEXTABLE_API_URL`, `TEXTABLE_API_KEY_x`, and `TEXTABLE_FROM_x` are correct.
* **Duplicate Sends:** Retell retries on 4xx/5xx. Ensure middleware returns `200` for success.

---

## 📌 Notes

* Each **Retell/Telogix Agent ID** must be mapped to a **Textable API Key** + **FromNumber**.
* Use `ngrok` only for testing. In production, deploy on a secure HTTPS endpoint.
* Textable’s **Webhook Integration** can also be enabled to sync incoming SMS into your CRM or app.

---

Would you like me to also include a **sample `.env.example` file** in the README so your client can just copy/rename it, or keep the `.env` instructions inline only?
