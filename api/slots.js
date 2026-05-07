// api/slots.js
// GET /api/slots?year=2026&month=5&timeZone=Asia%2FKarachi
// Fetches available slots for a full month from Cal.com and returns them.

const CAL_API_KEY    = process.env.CAL_API_KEY;
const EVENT_TYPE_ID  = 79775;
const CAL_API_BASE   = "https://api.cal.com/v2";

export default async function handler(req, res) {
  // ── CORS — allow your Clockwrk domain in production ───────────
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { year, month, timeZone = "Asia/Karachi" } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: "year and month are required" });
  }

  // Build start/end of requested month in ISO format
  const y          = parseInt(year,  10);
  const m          = parseInt(month, 10); // 1-indexed (January = 1)
  const startDate  = new Date(y, m - 1, 1);
  const endDate    = new Date(y, m, 0);   // last day of month

  const startISO   = startDate.toISOString().split("T")[0]; // "2026-05-01"
  const endISO     = endDate.toISOString().split("T")[0];   // "2026-05-31"

  const url = new URL(`${CAL_API_BASE}/slots`);
  url.searchParams.set("eventTypeId", EVENT_TYPE_ID);
  url.searchParams.set("startTime",   `${startISO}T00:00:00.000Z`);
  url.searchParams.set("endTime",     `${endISO}T23:59:59.999Z`);
  url.searchParams.set("timeZone",    timeZone);

  try {
    const calRes = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${CAL_API_KEY}`,
        "cal-api-version": "2024-09-04",
        "Content-Type":  "application/json",
      },
    });

    if (!calRes.ok) {
      const errBody = await calRes.text();
      console.error("Cal.com slots error:", calRes.status, errBody);
      return res.status(calRes.status).json({ error: "Failed to fetch slots from Cal.com", detail: errBody, status: calRes.status });
    }

    const data = await calRes.json();

    // Cal.com returns: { slots: { "2026-05-12": [{ time: "..." }, ...], ... } }
    // We normalise each date's slots to a plain array of "HH:MM" strings
    // in the user's requested timezone so the frontend stays simple.
    const raw      = data?.data?.slots ?? data?.slots ?? {};
    const normalised = {};

    Object.entries(raw).forEach(([dateKey, slotArr]) => {
      normalised[dateKey] = slotArr.map(slot => {
        // slot.time is an ISO string, e.g. "2026-05-12T09:00:00+05:00"
        const d    = new Date(slot.time);
        const hh   = d.toLocaleString("en-US", { hour: "2-digit",   hour12: false, timeZone });
        const mm   = d.toLocaleString("en-US", { minute: "2-digit",               timeZone });
        return `${hh.padStart(2,"0")}:${mm.padStart(2,"0")}`;
      });
    });

    // Cache for 5 minutes on Vercel's edge — slots don't change that fast
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json({ slots: normalised });

  } catch (err) {
    console.error("Proxy error (slots):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}