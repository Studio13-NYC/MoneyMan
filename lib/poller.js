const { fetchOpenAISpend } = require('./openai-spend');
const { fetchCursorSpend } = require('./cursor-spend');
const { generateNotificationMessage } = require('./llm-notify');
const { readSnapshot, writeSnapshot, dataEquals } = require('./storage');

let pollTimer = null;
let pollIntervalMs = 15 * 60 * 1000;
let lastState = null;
let onUpdate = () => {};

function getState() {
  return lastState;
}

function updatePollInterval(ms) {
  pollIntervalMs = ms;
  if (pollTimer != null) {
    clearTimeout(pollTimer);
    scheduleNext();
  }
}

function scheduleNext() {
  pollTimer = setTimeout(run, pollIntervalMs);
}

async function runOnce() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const cursorKey = process.env.CURSOR_API_KEY;
  const [openai, cursor] = await Promise.all([
    fetchOpenAISpend(openaiKey),
    fetchCursorSpend(cursorKey),
  ]);
  const current = {
    openaiTotal: openai.totalUsd,
    openaiError: openai.error || null,
    cursorTotal: cursor.totalUsd,
    cursorError: cursor.error || null,
    lastRun: new Date().toISOString(),
  };
  const previous = readSnapshot();
  const changed = !dataEquals(current, previous);
  if (changed) {
    writeSnapshot(current);
  }
  lastState = current;
  let notification = null;
  if (changed) {
    try {
      notification = await generateNotificationMessage(current, previous);
    } catch (_) {}
    if (!notification) {
      const total = (current.openaiTotal ?? 0) + (current.cursorTotal ?? 0);
      notification = `This month: OpenAI $${(current.openaiTotal ?? 0).toFixed(2)}, Cursor $${(current.cursorTotal ?? 0).toFixed(2)}. Total $${total.toFixed(2)}.`;
    }
  }
  onUpdate(current, notification);
  return current;
}

async function run() {
  pollTimer = null;
  try {
    await runOnce();
  } catch (e) {
    lastState = {
      ...lastState,
      lastRun: new Date().toISOString(),
      error: e.message || String(e),
    };
    onUpdate(lastState, null);
  }
  scheduleNext();
}

function startPolling(intervalMs, callback) {
  pollIntervalMs = intervalMs;
  onUpdate = callback || (() => {});
  run();
}

function stopPolling() {
  if (pollTimer != null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

module.exports = {
  getState,
  updatePollInterval,
  startPolling,
  stopPolling,
  runOnce,
};
