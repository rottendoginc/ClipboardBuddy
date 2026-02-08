// Main process entrypoint for Clipboard Buddy.
// Owns the popup window, tray icon, clipboard polling, global hotkey, modes,
// and IPC wiring to history and settings modules.
const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, clipboard, ipcMain, screen } = require('electron');
const path = require('path');
const { execFileSync } = require('child_process');
const history = require('./history');
const settings = require('./settings');

let mainWindow; // frameless popup that shows the history UI
let settingsWindow; // small window for editing hotkey and limits
let tray; // system tray / panel icon
let currentMode = 'default'; // active paste mode: 'default' | 'stack' | 'queue' | 'random'
let clipboardPollInterval = null; // timer handle for polling the system clipboard
let lastClipboardText = ''; // last text value we saw on the clipboard
let hotkeyRegistered = false; // whether the global shortcut successfully registered
let currentHotkey = null; // currently active accelerator string

function getBestCursorPoint() {
  // Try to obtain the real global cursor position.
  // On Linux/X11, Electron's screen API can sometimes return a
  // stale value. If xdotool is available, prefer it.
  if (process.platform === 'linux' && process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    try {
      const out = execFileSync('xdotool', ['getmouselocation', '--shell'], {
        encoding: 'utf8',
        timeout: 200
      });

      let x = null;
      let y = null;

      out.split(/\r?\n/).forEach((line) => {
        if (line.startsWith('X=')) x = Number(line.slice(2));
        if (line.startsWith('Y=')) y = Number(line.slice(2));
      });

      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    } catch (err) {
      console.warn('xdotool getmouselocation failed, falling back to Electron screen:', err.message);
    }
  }

  try {
    return screen.getCursorScreenPoint();
  } catch (err) {
    console.warn('screen.getCursorScreenPoint failed:', err.message);
    return null;
  }
}

function createWindow() {
  // Create the hidden popup window used for the above/below history list.
  mainWindow = new BrowserWindow({
    width: 420,
    height: 320,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('blur', () => {
    // Hide when it loses focus to behave like a popup
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  });
}

function showPopupNearCursor() {
  // Position the popup near the current mouse cursor, clamped safely
  // inside the nearest display. This version purposely accepts
  // negative coordinates (multi-monitor layouts) as long as they are
  // finite numbers, so the popup can appear to the right of the
  // cursor anywhere on the desktop.
  if (!mainWindow) return;

  const cursor = getBestCursorPoint();
  const hasValidCursor =
    cursor &&
    Number.isFinite(cursor.x) &&
    Number.isFinite(cursor.y);

  const targetDisplay = hasValidCursor
    ? screen.getDisplayNearestPoint(cursor)
    : screen.getPrimaryDisplay();

  const bounds = targetDisplay.workArea || targetDisplay.bounds;
  const [winWidth, winHeight] = mainWindow.getSize();
  const margin = 16;

  let x;
  let y;

  if (hasValidCursor) {
    // Start just to the right of the cursor, vertically centered.
    x = cursor.x + margin;
    y = cursor.y - Math.round(winHeight / 2);
  } else {
    // Fallback: middle-right of the target display.
    x = bounds.x + bounds.width - winWidth - margin;
    y = bounds.y + (bounds.height - winHeight) / 2;
  }

  // Clamp within the target display's work area with a small margin.
  const maxX = bounds.x + bounds.width - winWidth - margin;
  const minX = bounds.x + margin;
  const maxY = bounds.y + bounds.height - winHeight - margin;
  const minY = bounds.y + margin;

  x = Math.round(Math.min(Math.max(x, minX), maxX));
  y = Math.round(Math.min(Math.max(y, minY), maxY));

  mainWindow.setPosition(x, y, false);
  mainWindow.show();
  mainWindow.focus();
}

function createSettingsWindow() {
  // Open a small window that lets the user edit settings.json fields.
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 360,
    height: 220,
    resizable: false,
    title: 'Clipboard Buddy Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC wiring for history access and selection from the popup UI
ipcMain.handle('history:get', () => {
  return history.getState();
});

ipcMain.handle('history:select', (event, payload) => {
  const state = history.getState();
  const { region, index } = payload || {};

  let item = null;

  if (region === 'above' && Array.isArray(state.aboveItems)) {
    item = state.aboveItems[index] || null;
  } else if (region === 'below' && Array.isArray(state.belowItems)) {
    item = state.belowItems[index] || null;
  }

  if (!item) return;

  clipboard.writeText(item);

  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide();
  }
});

// IPC: renderer can suggest a window height based on content
ipcMain.handle('popup:setHeight', (event, requestedHeight) => {
  if (!mainWindow) return;
  const h = Number(requestedHeight);
  if (!Number.isFinite(h)) return;

  const minHeight = 120;
  const maxHeight = 520;
  const target = Math.max(minHeight, Math.min(maxHeight, Math.round(h)));

  const [w] = mainWindow.getSize();
  mainWindow.setSize(w, target, false);
});

// IPC wiring for persistent snippets
ipcMain.handle('history:addBelowFromClipboard', () => {
  const text = clipboard.readText();
  history.addBelow(text);
  updateTrayMenu();
});

ipcMain.handle('history:removeBelow', (event, index) => {
  history.removeBelow(index);
  updateTrayMenu();
});

// IPC wiring for settings
ipcMain.handle('settings:get', () => {
  return settings.get();
});

ipcMain.handle('settings:update', (event, partial) => {
  const updated = settings.update(partial || {});
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'maxHistoryItems')) {
    history.setMaxHistoryItems(updated.maxHistoryItems);
  }
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'hotkey')) {
    registerGlobalHotkey();
  }
  return updated;
});

function createTray() {
  // Prefer a user-provided colorful clipboard icon if available.
  // Place a PNG named "clipboard.png" next to main.js to override.
  let icon = nativeImage.createFromPath(path.join(__dirname, 'clipboard.png'));

  if (icon.isEmpty()) {
    // Fallback: 1x1 transparent PNG
    const transparentPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax3N+8AAAAASUVORK5CYII=';
    icon = nativeImage.createFromDataURL(`data:image/png;base64,${transparentPngBase64}`);
  }

  tray = new Tray(icon);
  tray.setToolTip('Clipboard Buddy');
  updateTrayMenu();
}

function updateTrayMenu() {
  // Build a tray context menu that shows recent snippets and controls.
  if (!tray) return;

  const { aboveItems = [], belowItems = [] } = history.getState();

  const historyItems = [];

  const makeLabel = (text) => {
    const firstLine = String(text || '')
      .split(/\r?\n/)[0]
      .trim();
    if (!firstLine) return '(empty)';
    return firstLine.length > 50 ? firstLine.slice(0, 47) + '…' : firstLine;
  };

  const maxItems = 8;

  if (aboveItems.length) {
    historyItems.push({ label: 'Above the line', enabled: false });
    aboveItems
      .slice(-maxItems)
      .reverse()
      .forEach((text) => {
        historyItems.push({
          label: makeLabel(text),
          click: () => {
            clipboard.writeText(text);
          }
        });
      });
  }

  if (belowItems.length) {
    if (historyItems.length) {
      historyItems.push({ type: 'separator' });
    }
    historyItems.push({ label: 'Below the line', enabled: false });
    belowItems.slice(0, maxItems).forEach((text) => {
      historyItems.push({
        label: makeLabel(text),
        click: () => {
          clipboard.writeText(text);
        }
      });
    });
  }

  const template = [
    ...historyItems,
    ...(historyItems.length ? [{ type: 'separator' }] : []),
    { label: 'Show Popup', click: showPopupNearCursor },
    {
      label: 'Clear Temporary History',
      click: () => {
        history.clearAbove();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: hotkeyRegistered
        ? `Hotkey: ${currentHotkey}`
        : 'Hotkey unavailable (system shortcut conflict or Wayland)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Mode: Default (Interactive List)',
      type: 'radio',
      checked: currentMode === 'default',
      click: () => setMode('default')
    },
    {
      label: 'Mode: Stack',
      type: 'radio',
      checked: currentMode === 'stack',
      click: () => setMode('stack')
    },
    {
      label: 'Mode: Queue',
      type: 'radio',
      checked: currentMode === 'queue',
      click: () => setMode('queue')
    },
    {
      label: 'Mode: Random',
      type: 'radio',
      checked: currentMode === 'random',
      click: () => setMode('random')
    },
    { type: 'separator' },
    { label: 'Settings...', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function setMode(mode) {
  // Change active paste mode and refresh tray radio checkmarks.
  currentMode = mode;
  updateTrayMenu();
}

function togglePopup() {
  // Show or hide the popup window without changing its size or position.
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showPopupNearCursor();
  }
}

function positionPopupNearCursor() {
  // Deprecated: popup is now always positioned relative to the primary display.
}

function registerGlobalHotkey() {
  // (Re)register the global accelerator from settings, updating tray status.
  const config = settings.get();
  const accelerator = config.hotkey || settings.DEFAULTS.hotkey;

  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
  }

  currentHotkey = accelerator;

  const success = globalShortcut.register(accelerator, () => {
    handleHotkey();
  });

  if (!success) {
    console.warn('Global hotkey registration failed. You may need to change the shortcut.');
    hotkeyRegistered = false;
    updateTrayMenu();
  } else {
    hotkeyRegistered = true;
    updateTrayMenu();
  }
}

function startClipboardPolling() {
  // Begin polling the system clipboard for text changes.
  if (clipboardPollInterval) return;

  lastClipboardText = clipboard.readText();

  clipboardPollInterval = setInterval(() => {
    try {
      const current = clipboard.readText();
      if (current && current !== lastClipboardText) {
        lastClipboardText = current;
        history.addCopiedText(current);
        updateTrayMenu();
      }
    } catch (err) {
      console.warn('Clipboard polling failed:', err.message);
    }
  }, 500);
}

function stopClipboardPolling() {
  // Stop polling the clipboard when the app is quitting.
  if (clipboardPollInterval) {
    clearInterval(clipboardPollInterval);
    clipboardPollInterval = null;
  }
}

function handleHotkey() {
  // Respond to the global hotkey based on the active mode.
  if (currentMode === 'default') {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showPopupNearCursor();
    }
    return;
  }

  const item = history.getNextForMode(currentMode);
  if (!item) {
    return;
  }

  clipboard.writeText(item);
}

app.whenReady().then(() => {
  // Initialize settings and history, then create UI and start services.
  settings.init(app);
  const config = settings.get();
  history.setMaxHistoryItems(config.maxHistoryItems);
  history.init(app);
  createWindow();
  createTray();
  registerGlobalHotkey();
  startClipboardPolling();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopClipboardPolling();
});

app.on('window-all-closed', () => {
  // Keep app running in tray on non-macOS
  if (process.platform !== 'darwin') {
    // Do not quit; just hide windows
  }
});
