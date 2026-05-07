// api/eventtype.js — temporary debug endpoint to find your event type ID and slug
// DELETE this file after you've confirmed the correct slug

const CAL_API_KEY  = process.env.CAL_API_KEY;
const CAL_API_BASE = "https://api.cal.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const calRes = await fetch(`${CAL_API_BASE}/event-types`, {
      headers: {
        "Authorization":   `Bearer ${CAL_API_KEY}`,
        "cal-api-version": "2024-06-14",
      },
    });

    const data = await calRes.json();

    if (!calRes.ok) {
      return res.status(calRes.status).json({ error: "Failed", detail: data });
    }

    // Return just the essentials — id, slug, title, length
    const simplified = (data?.data || []).map(et => ({
      id:       et.id,
      slug:     et.slug,
      title:    et.title,
      length:   et.lengthInMinutes,
      username: et.users?.[0]?.username,
    }));

    return res.status(200).json({ eventTypes: simplified });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
