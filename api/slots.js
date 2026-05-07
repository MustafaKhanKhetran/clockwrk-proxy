// api/slots.js
// GET /api/slots?year=2026&month=5&timeZone=Asia%2FKarachi

const CAL_API_KEY   = process.env.CAL_API_KEY;
const EVENT_TYPE_ID = 79775;
const CAL_API_BASE  = "https://api.cal.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  const { year, month, timeZone = "Asia/Karachi" } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: "year and month are required" });
  }

  const y       = parseInt(year,  10);
  const m       = parseInt(month, 10);
  const lastDay = new Date(y, m, 0).getDate();
  const start   = `${y}-${String(m).padStart(2,"0")}-01`;
  const end     = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

  const url = new URL(`${CAL_API_BASE}/slots`);
  url.searchParams.set("eventTypeId", EVENT_TYPE_ID);
  url.searchParams.set("start",       start);
  url.searchParams.set("end",         end);
  url.searchParams.set("timeZone",    timeZone);

  try {
    const calRes = await fetch(url.toString(), {
      headers: {
        "Authorization":   `Bearer ${CAL_API_KEY}`,
        "cal-api-version": "2024-09-04",
      },
    });

    if (!calRes.ok) {
      const errBody = await calRes.text();
      console.error("Cal.com slots error:", calRes.status, errBody);
      return res.status(calRes.status).json({ error: "Failed to fetch slots", detail: errBody });
    }

    const json = await calRes.json();

    // Response shape per docs:
    // { status: "success", data: { "2026-05-12": [{ start: "2026-05-12T09:00:00+05:00" }, ...] } }
    const raw        = json?.data ?? {};
    const normalised = {};

    Object.entries(raw).forEach(([dateKey, slotArr]) => {
      normalised[dateKey] = slotArr.map(slot => {
        const d  = new Date(slot.start ?? slot.time);
        const hh = d.toLocaleString("en-US", { hour: "2-digit",   hour12: false, timeZone });
        const mm = d.toLocaleString("en-US", { minute: "2-digit",               timeZone });
        return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
      });
    });

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json({ slots: normalised });

  } catch (err) {
    console.error("Proxy error (slots):", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}