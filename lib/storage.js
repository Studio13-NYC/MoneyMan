const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function getDataPath() {
  return path.join(app.getPath('userData'), 'moneyman-snapshot.json');
}

function readSnapshot() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSnapshot(data) {
  const file = getDataPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function dataEquals(a, b) {
  if (!a || !b) return false;
  const aTotal = (a.openaiTotal ?? 0) + (a.cursorTotal ?? 0);
  const bTotal = (b.openaiTotal ?? 0) + (b.cursorTotal ?? 0);
  if (Math.abs(aTotal - bTotal) > 0.0001) return false;
  if (Math.abs((a.openaiTotal ?? 0) - (b.openaiTotal ?? 0)) > 0.0001) return false;
  if (Math.abs((a.cursorTotal ?? 0) - (b.cursorTotal ?? 0)) > 0.0001) return false;
  return true;
}

module.exports = { readSnapshot, writeSnapshot, dataEquals };
