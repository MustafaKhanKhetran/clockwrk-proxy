// api/book.js
// POST /api/book

const CAL_API_KEY   = process.env.CAL_API_KEY;
const EVENT_TYPE_ID = 79775;
const CAL_API_BASE  = "https://api.cal.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const { name, email, notes, startISO, timeZone = "Asia/Karachi" } = req.body;

  if (!name || !email || !startISO) {
    return res.status(400).json({ error: "name, email and startISO are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Correct payload shape per Cal.com docs (2026-02-25)
  const payload = {
    eventTypeId: EVENT_TYPE_ID,
    start:       startISO,
    attendee: {
      name,
      email,
      timeZone,
      language: "en",
    },
    metadata: {
      notes: notes || "",
    },
  };

  try {
    const calRes = await fetch(`${CAL_API_BASE}/bookings`, {
      method:  "POST",
      headers: {
        "Authorization":   `Bearer ${CAL_API_KEY}`,
        "cal-api-version": "2026-02-25",
        "Content-Type":    "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await calRes.json();

    if (!calRes.ok) {
      console.error("Cal.com booking error:", calRes.status, data);
      return res.status(calRes.status).json({
        error: data?.message || data?.error?.message || "Failed to create booking",
        detail: data,
      });
    }

    return res.status(200).json({
      success:   true,
      bookingId: data?.data?.id  ?? data?.id,
      uid:       data?.data?.uid ?? data?.uid,
    });

  } catch (err) {
    console.error("Proxy error (book):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}