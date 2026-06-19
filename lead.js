// api/lead.js
// ---------------------------------------------------------------------------
// Sends each Implant 360 website lead to the SmileOx CRM using the SMTP2GO
// HTTP API (https://developers.smtp2go.com). No SMTP server and no nodemailer
// dependency — the function just makes one HTTPS POST with your API key, which
// is far more reliable inside a serverless function.
//
// Optional environment variables (Vercel -> Settings -> Environment Variables):
//   SMTP2GO_API_KEY  your SMTP2GO API key (overrides the fallback in this file)
//   SMTP_FROM        verified sender address (default: no-reply@implant360.com.au)
//   INTAKE_ADDRESS   the SmileOx intake email (default set below)
//   ALLOW_ORIGIN     your site origin for CORS (default "*")
// ---------------------------------------------------------------------------

// Your unique SmileOx CRM intake address.
const INTAKE_ADDRESS =
  process.env.INTAKE_ADDRESS ||
  "implant360-landing-page+fde0799b-8214-4d45-84a1-095135a68e6c@intake.smileox.com.au";

// SMTP2GO API key. Best practice: set SMTP2GO_API_KEY in Vercel and delete the
// fallback below so the key isn't committed to your repo (rotate it if exposed).
const API_KEY =
  process.env.SMTP2GO_API_KEY || "api-C6CDD66A71FD442FA366A54B3A0490E0";

// Must be an address on a sender domain you have verified in SMTP2GO.
const SENDER = process.env.SMTP_FROM || "Implant 360 <no-reply@implant360.com.au>";

module.exports = async (req, res) => {
  const origin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body =
      typeof req.body === "object" && req.body
        ? req.body
        : JSON.parse(req.body || "{}");

    // Honeypot — bots fill the hidden "company" field.
    if (body.company) return res.status(200).json({ ok: true });

    const firstName = (body.firstName || "").toString().trim();
    const lastName = (body.lastName || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const phoneNumber = (body.phoneNumber || "").toString().trim();
    const paymentPreference = (body.paymentPreference || "").toString().trim();
    const toothSituation = (body.toothSituation || "").toString().trim();
    const postcode = (body.postcode || "").toString().trim();

    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    if (!API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Server email is not configured (SMTP2GO_API_KEY)",
      });
    }

    // Everything we captured — SmileOx parses this JSON as the lead.
    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber,
      paymentPreference,
      toothSituation,
      postcode,
    };

    const smtp2go = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Smtp2go-Api-Key": API_KEY,
      },
      body: JSON.stringify({
        api_key: API_KEY, // also in body for maximum compatibility
        sender: SENDER,
        to: [INTAKE_ADDRESS],
        subject: "New Implant 360 enquiry — " + firstName + " " + lastName,
        text_body: JSON.stringify(payload),
      }),
    });

    const result = await smtp2go.json().catch(() => ({}));
    const data = (result && result.data) || {};
    const succeeded = Number(data.succeeded || 0);

    if (!smtp2go.ok || succeeded < 1) {
      const detail =
        (Array.isArray(data.failures) && data.failures.length && data.failures.join("; ")) ||
        data.error ||
        (data.field_validation_errors && JSON.stringify(data.field_validation_errors)) ||
        (result && result.error) ||
        "HTTP " + smtp2go.status;
      console.error("SMTP2GO send failed:", JSON.stringify(result));
      return res.status(502).json({ ok: false, error: "Failed to send", detail });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead relay failed:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to send",
      detail: String(err && err.message ? err.message : err),
    });
  }
};
