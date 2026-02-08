// JSON-backed configuration for Clipboard Buddy.
// Stores user-selected global hotkey and maximum history size.
const fs = require('fs');
const path = require('path');

let settingsPath = null; // location of settings JSON file
let cachedSettings = null; // in-memory copy of last-loaded settings

const DEFAULTS = {
  hotkey: process.platform === 'darwin' ? 'Command+Alt+V' : 'Control+Alt+V',
  maxHistoryItems: 200
};

function init(app) {
  // Compute settings path and prime the cache by loading from disk.
  const userDataPath = app.getPath('userData');
  settingsPath = path.join(userDataPath, 'clipboard-buddy-settings.json');
  load();
}

function load() {
  // Load settings from JSON (if present), falling back to defaults.
  if (!settingsPath) return DEFAULTS;
  if (cachedSettings) return cachedSettings;
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(raw);
      cachedSettings = { ...DEFAULTS, ...parsed };
    } else {
      cachedSettings = { ...DEFAULTS };
    }
  } catch {
    cachedSettings = { ...DEFAULTS };
  }
  return cachedSettings;
}

function save(newSettings) {
  // Merge and persist settings to disk (best-effort; failures are non-fatal).
  if (!settingsPath) return;
  cachedSettings = { ...DEFAULTS, ...cachedSettings, ...newSettings };
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(cachedSettings, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function get() {
  // Public getter used by main process and renderer.
  return load();
}

function update(partial) {
  // Merge a partial update and return the fresh merged settings.
  save(partial || {});
  return get();
}

module.exports = {
  init,
  get,
  update,
  DEFAULTS
};
