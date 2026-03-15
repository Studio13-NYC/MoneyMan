/**
 * Fetch current billing cycle spend from Cursor Admin API.
 * POST https://api.cursor.com/teams/spend (Enterprise teams).
 * Uses Basic auth: API key as username, empty password.
 */
async function fetchCursorSpend(apiKey) {
  if (!apiKey || !apiKey.trim()) return { totalUsd: 0, error: 'No API key' };
  const url = 'https://api.cursor.com/teams/spend';
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageSize: 500 }),
    });
    if (res.status === 403) {
      return { totalUsd: 0, error: 'Cursor spend requires an Enterprise team. Personal/Pro: use cursor.com/dashboard for usage. Key from: cursor.com → Settings → Admin API (team admins only).' };
    }
    if (res.status === 401) {
      return { totalUsd: 0, error: 'Invalid Cursor API key. Use the key from cursor.com → team Settings → Advanced → Admin API Keys (create as team admin).' };
    }
    if (!res.ok) {
      const text = await res.text();
      let detail = text.slice(0, 300);
      try {
        const j = JSON.parse(text);
        if (j.message) detail = j.message;
        else if (j.error) detail = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
      } catch (_) {}
      return { totalUsd: 0, error: `Cursor ${res.status}: ${detail}` };
    }
    const data = await res.json();
    const members = data.teamMemberSpend || [];
    let totalCents = 0;
    for (const m of members) {
      if (typeof m.spendCents === 'number') totalCents += m.spendCents;
    }
    const totalUsd = totalCents / 100;
    return { totalUsd, error: null, memberCount: members.length };
  } catch (e) {
    return { totalUsd: 0, error: e.message || String(e) };
  }
}

module.exports = { fetchCursorSpend };
