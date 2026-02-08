// Minimal Electron app to inspect what Linux reports for
// cursor position and display bounds. Run with:
//   npm run mouse-test

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'mouse-test.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Periodically send cursor + display info to the renderer.
  const sendData = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const cursor = screen.getCursorScreenPoint();
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();

    mainWindow.webContents.send('cursor-data', {
      timestamp: new Date().toISOString(),
      cursor,
      displays,
      primary
    });
  };

  sendData();
  setInterval(sendData, 250);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // For this test app, quit when all windows are closed (even on macOS).
  app.quit();
});
