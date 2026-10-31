const OpenAI = require('openai');

/**
 * Ask the LLM to produce a short, friendly notification message comparing
 * current vs previous spend. Uses OPENAI_API_KEY and OPENAI_MODEL_SIMPLER_TASKS or gpt-6.1-terra.
 */
async function generateNotificationMessage(current, previous, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  const client = new OpenAI({ apiKey });
  const m = model || process.env.OPENAI_MODEL_SIMPLER_TASKS || 'gpt-6.1-terra';
  const openAINow = current?.openaiTotal ?? 0;
  const cursorNow = current?.cursorTotal ?? 0;
  const openAIPrev = previous?.openaiTotal ?? 0;
  const cursorPrev = previous?.cursorTotal ?? 0;
  const totalNow = openAINow + cursorNow;
  const totalPrev = openAIPrev + cursorPrev;
  const hasPrev = previous != null && (openAIPrev > 0 || cursorPrev > 0);
  const system = `You are a concise assistant. Write exactly one short sentence for a desktop notification (max ~80 chars). No greeting, no sign-off. Focus on this month's spend and change.`;
  const user = hasPrev
    ? `This month so far: OpenAI $${openAINow.toFixed(2)}, Cursor $${cursorNow.toFixed(2)}. Previous snapshot: OpenAI $${openAIPrev.toFixed(2)}, Cursor $${cursorPrev.toFixed(2)}. Total now $${totalNow.toFixed(2)} (was $${totalPrev.toFixed(2)}). Write one short notification line.`
    : `This month so far: OpenAI $${openAINow.toFixed(2)}, Cursor $${cursorNow.toFixed(2)}. Total $${totalNow.toFixed(2)}. First run. Write one short notification line.`;
  try {
    const completion = await client.chat.completions.create({
      model: m,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: 8192,
      reasoning_effort: m.startsWith('gpt-6-astra') ? 'medium' : 'high',
    });
    const text = completion.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    return null;
  }
}

module.exports = { generateNotificationMessage };
