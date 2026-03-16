/**
 * Fetch current month spend from OpenAI organization costs API.
 * GET https://api.openai.com/v1/organization/costs
 */
async function fetchOpenAISpend(apiKey) {
  if (!apiKey || !apiKey.trim()) return { totalUsd: 0, error: 'No API key' };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTime = Math.floor(start.getTime() / 1000);
  const endTime = Math.floor(now.getTime() / 1000);
  const url = `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=1d&limit=31`;
  let totalUsd = 0;
  let page = null;
  try {
    do {
      const q = page ? `&page=${encodeURIComponent(page)}` : '';
      const res = await fetch(url + q, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = text.slice(0, 300);
        try {
          const j = JSON.parse(text);
          if (j.error?.message) detail = j.error.message;
          else if (j.error) detail = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
        } catch (_) {}
        const hint = res.status === 401
          ? ' Check: key in .env as OPENAI_API_KEY; key not revoked; key has access to Organization.'
          : res.status === 403
          ? ' Costs API may require an org admin key or usage role. See platform.openai.com/settings/organization.'
          : '';
        return { totalUsd: 0, error: `OpenAI ${res.status}: ${detail}${hint}` };
      }
      const data = await res.json();
      for (const bucket of data.data || []) {
        const results = bucket.results || bucket.result || [];
        for (const r of results) {
          if (!r || typeof r !== 'object') continue;
          if (r.amount != null) {
            const currency = (r.amount.currency || 'usd').toString().toLowerCase();
            if (currency === 'usd') {
              const val = Number(r.amount.value);
              if (!Number.isNaN(val)) totalUsd += val;
            }
          }
        }
      }
      page = data.next_page || null;
    } while (page);
    return { totalUsd, error: null };
  } catch (e) {
    return { totalUsd: 0, error: e.message || String(e) };
  }
}

module.exports = { fetchOpenAISpend };
