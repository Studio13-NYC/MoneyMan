(function () {
  const openaiEl = document.querySelector('[data-value="openai"]');
  const cursorEl = document.querySelector('[data-value="cursor"]');
  const openaiMeta = document.querySelector('[data-meta="openai"]');
  const cursorMeta = document.querySelector('[data-meta="cursor"]');
  const totalEl = document.querySelector('[data-total]');
  const updatedEl = document.querySelector('[data-updated]');
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
    runBtn.textContent = '…';
    try {
      const state = await window.moneyman.runNow();
      render(state);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Refresh';
    }
  });

  load();
})();
