// In-memory and persistent clipboard history management.
// - aboveItems: temporary text entries (cleared on app exit).
// - belowItems: persistent snippets saved to a JSON file.
const fs = require('fs');
const path = require('path');

let aboveItems = [];
let belowItems = [];
let storePath = null; // location of JSON file that stores belowItems
let maxHistoryItems = 200; // cap for aboveItems length

function init(app) {
  // Prepare persistent storage path and load any existing belowItems from disk.
  const userDataPath = app.getPath('userData');
  storePath = path.join(userDataPath, 'clipboard-buddy.json');
  loadPersistent();
}

function loadPersistent() {
  // Read belowItems from JSON file if it exists.
  if (!storePath) return;
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.belowItems)) {
        belowItems = parsed.belowItems.map(String);
      }
    }
  } catch (err) {
    console.warn('Failed to load persistent clipboard data:', err.message);
  }
}

function savePersistent() {
  // Write current belowItems to JSON file, creating parent directories if needed.
  if (!storePath) return;
  try {
    const data = {
      belowItems
    };
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save persistent clipboard data:', err.message);
  }
}

function addCopiedText(text) {
  // Add a new text entry to the temporary above-the-line history.
  const value = String(text || '').trim();
  if (!value) return;

  // Avoid adding duplicate consecutive entries
  if (aboveItems.length > 0 && aboveItems[aboveItems.length - 1] === value) {
    return;
  }

  aboveItems.push(value);

  if (aboveItems.length > maxHistoryItems) {
    aboveItems = aboveItems.slice(-maxHistoryItems);
  }
}

function clearAbove() {
  // Drop all temporary aboveItems.
  aboveItems = [];
}

function getState() {
  // Return shallow copies so callers cannot mutate internal arrays.
  return {
    aboveItems: [...aboveItems],
    belowItems: [...belowItems]
  };
}

function getNextForMode(mode) {
  // Compute the next item based on the current paste mode.
  // belowItems are treated as pinned and are not modified here.
  // For now, operate only on aboveItems. belowItems are treated as pinned snippets.
  if (aboveItems.length === 0) return null;

  if (mode === 'stack') {
    return aboveItems.pop();
  }

  if (mode === 'queue') {
    return aboveItems.shift();
  }

  if (mode === 'random') {
    const idx = Math.floor(Math.random() * aboveItems.length);
    return aboveItems[idx]; // do not remove
  }

  // default: just peek the last item
  return aboveItems[aboveItems.length - 1];
}

// Simple helper for future use: allow external code to replace belowItems and save.
function setBelowItems(items) {
  if (!Array.isArray(items)) return;
  belowItems = items.map((v) => String(v || ''));
  savePersistent();
}

function addBelow(text) {
  // Append a new persistent snippet if it is non-empty and not already present.
  const value = String(text || '').trim();
  if (!value) return;

  if (belowItems.includes(value)) return;
  belowItems.push(value);
  savePersistent();
}

function removeBelow(index) {
  // Remove a persistent snippet at the given index.
  if (index < 0 || index >= belowItems.length) return;
  belowItems.splice(index, 1);
  savePersistent();
}

function setMaxHistoryItems(n) {
  // Update the limit for aboveItems and trim existing entries if necessary.
  const parsed = Number(n);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  maxHistoryItems = Math.floor(parsed);
  if (aboveItems.length > maxHistoryItems) {
    aboveItems = aboveItems.slice(-maxHistoryItems);
  }
}

module.exports = {
  init,
  addCopiedText,
  clearAbove,
  getState,
  getNextForMode,
  loadPersistent,
  savePersistent,
  setBelowItems,
  addBelow,
  removeBelow,
  setMaxHistoryItems
};
