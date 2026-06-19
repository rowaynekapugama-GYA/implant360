# Implant 360 — landing page

A single-page, liquid-glass landing page for dental-implant enquiries in Western
Sydney (Dr Ramesh Harichandran, operating out of Western Sydney Smiles, St Marys),
with a lead-capture form that emails submissions to the SmileOx CRM.

Same look, feel and mobile swipe behaviour as the Wollongong Implant Institute site.

## Files
- `index.html` — the entire site (HTML, CSS and JS inline; fonts load from Google Fonts)
- `api/lead.js` — serverless function that emails each lead to the SmileOx intake over SMTP/TLS
- `package.json` — declares the one dependency (nodemailer) the function needs
- `*.webp` — all images (logo, dentist, practice photos, 6 before/after results)

## Deploy (Vercel) — same process as the Wollongong site
1. Push these files to a **new** GitHub repo — keep the `api/` folder and its path intact, and keep all `.webp` files in the repo root next to `index.html`.
2. Import the repo at vercel.com (Framework Preset: **Other**; leave Build Command and Output Directory blank).
3. Add the SMTP environment variables below, then **redeploy** (env vars only take effect on a fresh deploy).
4. Add your custom domain in Vercel → Settings → Domains, then add the matching record at your DNS provider.

The form posts to `/api/lead` on the same domain, so there is no CORS to configure.

## Environment variables (Vercel → Settings → Environment Variables)
- `SMTP_HOST` = `mail.smtp2go.com`
- `SMTP_PORT` = `587`
- `SMTP_USER` = your SMTP2GO username
- `SMTP_PASS` = your SMTP2GO password / API key
- `SMTP_FROM` = a verified sender, e.g. `no-reply@implant360.com.au`
- `INTAKE_ADDRESS` = your SmileOx intake email (or hard-code it in `api/lead.js`)

## The form
Captures: first name, last name, email, phone (all required) plus three qualifying
questions — how they want to pay, single vs multiple missing teeth (tappable chips),
and postcode. All fields are forwarded to SmileOx in the lead payload.

## Still to fill in before launch
- **Dr Ramesh's AHPRA registration number** — replace `[add registration number]` (3 places: the before/after disclaimer, the mobile booking panel, and the desktop footer).
- **SmileOx intake email** — set `INTAKE_ADDRESS` in Vercel, or replace `REPLACE_WITH_YOUR_SMILEOX_INTAKE_EMAIL` in `api/lead.js`.
- **SMTP2GO credentials** — add the env vars above and redeploy.
