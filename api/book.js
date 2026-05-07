// api/book.js
// POST /api/book
// Creates a booking on Cal.com via slug + username (no hardcoded ID needed)

const CAL_API_KEY     = process.env.CAL_API_KEY;
const CAL_USERNAME    = "mustafa-khan-khetran";
const EVENT_TYPE_SLUG = "let-s-schedule-a-call";
const CAL_API_BASE    = "https://api.cal.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const { name, email, notes, startISO, timeZone = "Asia/Karachi" } = req.body;

  // Basic validation
  if (!name || !email || !startISO) {
    return res.status(400).json({ error: "name, email and startISO are required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Booking payload per Cal.com docs (cal-api-version 2024-08-13)
  // Using eventTypeSlug + username — no hardcoded ID needed
  const payload = {
    eventTypeSlug: EVENT_TYPE_SLUG,
    username:      CAL_USERNAME,
    start:         startISO,          // UTC ISO string e.g. "2026-05-12T09:00:00Z"
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
        "cal-api-version": "2024-08-13",
        "Content-Type":    "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await calRes.json();

    if (!calRes.ok) {
      console.error("Cal.com booking error:", calRes.status, JSON.stringify(data));
      return res.status(calRes.status).json({
        error:  data?.message || data?.error?.message || "Failed to create booking",
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