// api/lead.js
// ---------------------------------------------------------------------------
// Relays an Implant 360 website-form submission to your SmileOx CRM intake
// address by email. A browser cannot speak SMTP, so the landing page POSTs the
// lead here as JSON and this function sends it on over SMTP/TLS.
//
// Drop this file in an /api folder of a Vercel project and deploy alongside
// index.html (CONFIG.FORM_ENDPOINT is already set to "/api/lead").
//
// Required environment variables (set in Vercel → Settings → Environment
// Variables — NOT here):
//   SMTP_HOST   your SMTP server, e.g. mail.smtp2go.com
//   SMTP_USER   SMTP username (from your SMTP2GO dashboard)
//   SMTP_PASS   SMTP password / API key
//   SMTP_FROM   the verified "from" address, e.g. no-reply@implant360.com.au
// Optional:
//   SMTP_PORT       587 (STARTTLS, recommended) or 465 (implicit TLS)
//   INTAKE_ADDRESS  overrides the SmileOx intake address set below
//   ALLOW_ORIGIN    your site's origin to lock down CORS, e.g. https://implant360.com.au
// ---------------------------------------------------------------------------

import nodemailer from "nodemailer";

// Your unique SmileOx CRM intake address.
// >>> REPLACE the placeholder with the real intake email SmileOx gives you,
//     or set an INTAKE_ADDRESS environment variable in Vercel. <<<
const INTAKE_ADDRESS =
  process.env.INTAKE_ADDRESS || "REPLACE_WITH_YOUR_SMILEOX_INTAKE_EMAIL";

export default async function handler(req, res) {
  // --- CORS ---
  const origin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body
      ? req.body
      : JSON.parse(req.body || "{}");

    // Honeypot: bots fill the hidden "company" field. Pretend success and drop it.
    if (body.company) return res.status(200).json({ ok: true });

    const firstName   = (body.firstName   || "").toString().trim();
    const lastName    = (body.lastName    || "").toString().trim();
    const email       = (body.email       || "").toString().trim();
    const phoneNumber = (body.phoneNumber || "").toString().trim();

    // Extra qualifying questions (optional).
    const paymentPreference = (body.paymentPreference || "").toString().trim();
    const toothSituation    = (body.toothSituation    || "").toString().trim();
    const postcode          = (body.postcode          || "").toString().trim();

    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    // Forward all captured fields to the CRM intake.
    const payload = {
      firstName, lastName, email, phoneNumber,
      paymentPreference, toothSituation, postcode,
    };

    // Human-readable summary (handy if your CRM shows the email body instead of JSON).
    const summary = [
      "New Implant 360 enquiry",
      "",
      "Name:      " + firstName + " " + lastName,
      "Email:     " + email,
      "Phone:     " + phoneNumber,
      "Postcode:  " + (postcode || "—"),
      "Paying:    " + (paymentPreference || "—"),
      "Replacing: " + (toothSituation || "—"),
    ].join("\n");

    const port = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,   // 465 = implicit TLS; 587 = STARTTLS
      requireTLS: true,       // never send in the clear
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      to: INTAKE_ADDRESS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      replyTo: email,
      subject: "New Implant 360 enquiry — " + firstName + " " + lastName,
      text: JSON.stringify(payload),   // JSON body for CRM parsing
      // If SmileOx reads the readable body instead of JSON, replace the line
      // above with:   text: summary,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead relay failed:", err);
    return res.status(500).json({ ok: false, error: "Failed to send" });
  }
}
