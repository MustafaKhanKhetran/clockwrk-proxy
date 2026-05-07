# Clockwrk Proxy — Deploy Guide

## What this is
A tiny two-route Node.js proxy that sits between your booking page and Cal.com.
Your API key lives only here — never in the browser.

---

## Step 1 — Push to GitHub

1. Create a new **private** repo on GitHub called `clockwrk-proxy`
2. From inside the `clockwrk-proxy` folder, run:

```bash
git init
git add .
git commit -m "initial proxy"
git remote add origin https://github.com/YOUR_USERNAME/clockwrk-proxy.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in (free account is fine)
2. Click **"Add New Project"**
3. Import your `clockwrk-proxy` GitHub repo
4. Leave all build settings as default — Vercel auto-detects it
5. Click **Deploy**

Vercel will give you a URL like:
```
https://clockwrk-proxy.vercel.app
```

---

## Step 3 — Add your API key as an Environment Variable

**Never commit your API key to Git.**

In your Vercel project:
1. Go to **Settings → Environment Variables**
2. Add these two variables:

| Name             | Value                                        |
|------------------|----------------------------------------------|
| `CAL_API_KEY`    | `calid_dc5aef840ea90a764de14bab73e4e7b3`     |
| `ALLOWED_ORIGIN` | `https://clockwrk.com` (your actual domain)  |

3. Click **Save**
4. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy**

---

## Step 4 — Update the frontend

In `book-a-call.html`, find this line near the top of the Step 3 JS:

```js
const BK_PROXY_URL = "https://clockwrk-proxy.vercel.app";
```

Replace `clockwrk-proxy.vercel.app` with your actual Vercel URL from Step 2.

---

## Step 5 — Test it

Open your browser console and run:

```js
fetch("https://clockwrk-proxy.vercel.app/api/slots?year=2026&month=5&timeZone=Asia%2FKarachi")
  .then(r => r.json())
  .then(console.log)
```

You should see real slot data from Cal.com. If you see an error, check:
- The `CAL_API_KEY` environment variable is set correctly in Vercel
- You redeployed after adding the variable

---

## How it works in production

```
User visits book-a-call.html
  → clicks "Pick a day and time"
    → frontend calls  GET  /api/slots?year=2026&month=5
      → proxy calls Cal.com with secret API key
        → Cal.com returns available slots
      → proxy normalises + returns slot data
    → calendar renders real available days

User picks a slot and clicks Confirm
  → frontend calls  POST  /api/book  { name, email, notes, startISO, timeZone }
    → proxy calls Cal.com /v2/bookings
      → Cal.com creates booking + sends confirmation email
    → proxy returns { success: true }
  → success screen shown
```

---

## Updating in the future

Any change to the proxy files → just `git push` and Vercel redeploys automatically.
