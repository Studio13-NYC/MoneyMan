(function () {
  const openaiEl = document.querySelector('[data-value="openai"]');
  const cursorEl = document.querySelector('[data-value="cursor"]');
  const openaiMeta = document.querySelector('[data-meta="openai"]');
  const cursorMeta = document.querySelector('[data-meta="cursor"]');
  const totalEl = document.querySelector('[data-total]');
  const updatedEl = document.querySelector('[data-updated]');
  const helpErrorsEl = document.querySelector('[data-help-errors]');
  const pollInput = document.getElementById('poll-interval');
  const runBtn = document.getElementById('run-now');

  function formatUsd(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return `$${Number(n).toFixed(2)}`;
  }

  function render(state) {
    if (!state) return;
    const openai = state.openaiTotal;
    const cursor = state.cursorTotal;
    openaiEl.textContent = formatUsd(openai);
    cursorEl.textContent = formatUsd(cursor);
    openaiMeta.textContent = state.openaiError || '';
    openaiMeta.classList.toggle('error', !!state.openaiError);
    cursorMeta.textContent = state.cursorError || '';
    cursorMeta.classList.toggle('error', !!state.cursorError);
    const total = (openai ?? 0) + (cursor ?? 0);
    totalEl.textContent = formatUsd(total);
    if (state.lastRun) {
      updatedEl.textContent = `Updated ${new Date(state.lastRun).toLocaleString()}`;
    } else {
      updatedEl.textContent = '';
    }
    // Show full error details in API help section
    if (helpErrorsEl) {
      const parts = [];
      if (state.openaiError) {
        parts.push('<div class="err-line"><span class="err-label">OpenAI:</span> ' + escapeHtml(state.openaiError) + '</div>');
      }
      if (state.cursorError) {
        parts.push('<div class="err-line"><span class="err-label">Cursor:</span> ' + escapeHtml(state.cursorError) + '</div>');
      }
      helpErrorsEl.innerHTML = parts.length ? parts.join('') : '<div class="err-line err-muted">No API errors. If values show —, run "Check now" and ensure .env has OPENAI_API_KEY (and optionally CURSOR_API_KEY).</div>';
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  window.moneyman.onStateUpdate(render);

  async function load() {
    const state = await window.moneyman.getState();
    const config = await window.moneyman.getConfig();
    render(state);
    if (config && config.pollIntervalMinutes != null) {
      pollInput.value = config.pollIntervalMinutes;
    }
  }

  pollInput.addEventListener('change', async () => {
    const min = Math.max(5, Math.min(1440, Number(pollInput.value) || 15));
    pollInput.value = min;
    await window.moneyman.setConfig({ pollIntervalMinutes: min });
  });

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.textContent = 'Checking…';
    try {
      const state = await window.moneyman.runNow();
      render(state);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Check now';
    }
  });

  load();
})();
