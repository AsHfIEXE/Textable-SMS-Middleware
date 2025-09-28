# Textable-SMS-Middleware
This middleware connects an AI voice/chat agent (via Retell AI / Telogix) to the Textable SMS API. When an agent calls a custom function (e.g., send_textable_sms), the request is routed through this middleware, which sends the SMS using the correct customer’s Textable account and phone number.
