const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'moneyman-config.json');
}

const DEFAULTS = {
  pollIntervalMinutes: 15,
};

function getConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function setConfig(partial) {
  const current = getConfig();
  const next = { ...current, ...partial };
  const file = getConfigPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = { getConfig, setConfig };
