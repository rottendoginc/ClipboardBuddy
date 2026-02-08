# Clipboard Buddy

Simple cross-platform clipboard helper with a popup history, designed primarily for Linux Mint 22.3 (Cinnamon).

## Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

## Install & Run

### Linux / macOS (development)

1. Open a terminal in this folder:

   ```bash
   cd "ClipboardBuddy"
   ```

2. Install dependencies (this pulls in Electron):

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm start
   ```

4. What you should see:
   - A new tray / panel icon. If you place a colorful clipboard PNG named `clipboard.png` next to `main.js`, that image will be used; otherwise a minimal placeholder icon is shown.
   - Pressing the global hotkey (`Ctrl+Alt+V` on Linux/Windows, `Cmd+Alt+V` on macOS by default) toggles a small popup window that appears just to the right of your mouse cursor (clamped to stay on-screen).
   - As you copy text in other applications, the app tracks those copies in an in-memory **"above the line"** history.
   - The popup shows clickable items for recent copies and for persistent **"below the line"** snippets. Clicking an item copies it back to the system clipboard and hides the popup.
   - The tray context menu also shows recent above/below items at the top; selecting one from the menu copies it directly to the clipboard without opening the popup.

If the hotkey does nothing or conflicts with an existing shortcut, check your desktop environment's keyboard settings and free up or change `Ctrl+Alt+V`. You can also change the hotkey inside the app via the **Settings…** entry in the tray context menu.

### Windows (development)

Clipboard Buddy is built with Electron and also runs on Windows in development mode.

1. Install a recent LTS version of Node.js from https://nodejs.org/ (this includes npm).
2. Open **Command Prompt** or **PowerShell** and change into the ClipboardBuddy folder, for example:

   ```powershell
   cd "C:\path\to\ClipboardBuddy"
   ```

3. Install dependencies:

   ```powershell
   npm install
   ```

4. Start the app:

   ```powershell
   npm start
   ```

5. A tray / notification area icon should appear. Use the default hotkey `Ctrl+Alt+V` to toggle the popup next to your mouse cursor.

If the hotkey is blocked or already used by Windows or another app, open **Settings…** from the tray menu and choose a different accelerator (for example `Ctrl+Shift+V`).

## Current Features

- **Clipboard history tracking**
   - Watches the system clipboard for text changes and keeps a temporary **above-the-line** history (configurable maximum size, default 200).
   - Avoids adding consecutive duplicate entries.

- **Popup window**
   - Opened by the global hotkey (Default mode) or the **Show Popup** tray command.
   - Appears just to the right of the current mouse cursor, clamped inside the nearest display so it never ends up off-screen.
   - Shows above-the-line items and persistent below-the-line snippets in two regions, separated by a thin horizontal line.
   - Each region scrolls independently with hidden scrollbars.
   - The popup automatically resizes its height to fit the current content, within sensible min/max limits.
   - Multi-line entries are rendered as a single-line preview with blue text as a visual indicator.
   - Clicking any item copies it to the clipboard and hides the popup.
   - A `+` button in the lower-right adds the current clipboard contents as a new persistent snippet.
   - Below-the-line items have a small `✕` button to remove them.

- **Tray context menu**
   - Shows a short list of recent above-the-line and below-the-line items at the top; clicking one copies that text directly to the clipboard.
   - Provides **Show Popup**, **Clear Temporary History**, paste **Modes**, **Settings…**, and **Quit** actions.

- **Paste modes**
   - **Default** – toggles the popup so you can choose an item.
   - **Stack** – hotkey pastes the newest above-the-line item and removes it (LIFO).
   - **Queue** – hotkey pastes the oldest above-the-line item and removes it (FIFO).
   - **Random** – hotkey picks a random above-the-line item and copies it (without removal).

- **Settings**
   - Stored in a JSON file under the Electron `userData` directory.
   - Change the global hotkey accelerator.
   - Change the maximum number of above-the-line history entries.

- **Persistence**
   - Below-the-line snippets are stored in a JSON file under the Electron `userData` directory and survive restarts.
   - Temporary above-the-line history is in-memory only and is cleared when the app exits.

Clipboard Buddy currently only tracks plain text clipboard data; images and other rich formats are ignored.

You can start the app with `npm start` right now to see the tray, popup, live clipboard history, persistent snippets, and modes in action.

## Packaging for Linux (AppImage / deb)

This project is configured to use `electron-builder` so you can create installable packages.

1. Install dependencies (if you haven’t already):

    ```bash
    npm install
    ```

2. Build packages:

    ```bash
    npm run dist
    ```

3. Look in the `dist/` folder for:
    - A `.AppImage` file (runs on most modern Linux systems without installation).
    - A `.deb` file (installable on Debian/Ubuntu/Mint via your package manager).

On Linux Mint, you can usually double-click the `.deb` in your file manager to install it, or mark the `.AppImage` as executable and run it directly.

## Packaging for Windows (Installer)

On a Windows machine with Node.js installed, you can build a simple installer using the same `electron-builder` setup:

1. Open **Command Prompt** or **PowerShell** in the ClipboardBuddy folder.
2. Install dependencies (once):

   ```powershell
   npm install
   ```

3. Build the installer:

   ```powershell
   npm run dist
   ```

4. Look in the `dist/` folder for an installer file named similar to:

   ```
   Clipboard Buddy Setup 0.1.0.exe
   ```

Double-click that `.exe` to install Clipboard Buddy like a normal Windows application. After installation, you should find it in the Start Menu and see its tray icon when running.

## Autostart on Linux Mint

Once you have a package you like (for example, an AppImage in a stable location), you can make Clipboard Buddy start automatically:

- **Using Startup Applications (GUI):**
   - Open **Startup Applications** in Mint.
   - Add a new entry pointing to your Clipboard Buddy binary (e.g. the AppImage path).
   - Give it a friendly name like "Clipboard Buddy".

- **Using a `.desktop` file (advanced):**
   - Create a file like `~/.config/autostart/clipboard-buddy.desktop` with content similar to:

      ```ini
      [Desktop Entry]
      Type=Application
      Name=Clipboard Buddy
      Exec=/full/path/to/Clipboard\ Buddy.AppImage
      X-GNOME-Autostart-enabled=true
      ```

   - Adjust the `Exec` path to match where you keep the AppImage or installed binary.

## How to Use Clipboard Buddy

- **Above the line (temporary history)**
   - Every time you copy text in any app, Clipboard Buddy adds it to the above-the-line list.
   - This list is in-memory only and is cleared when you quit Clipboard Buddy.
   - Items appear with only their first line shown; multi-line items are shown in blue.

- **Below the line (persistent snippets)**
   - Below-the-line items are your saved snippets; they are stored on disk and survive restarts.
   - To add a persistent item, copy some text, open the popup (Default mode hotkey), then click the **+** button in the lower-right. The current clipboard text is added below the line.
   - To remove a persistent item, click its small **✕** button.

- **Selecting and pasting items**
   - In the popup: click any item (above or below the line) to copy it to the system clipboard; then press your normal paste shortcut (for example `Ctrl+V`).
   - From the tray menu: pick any item from the history section at the top; it is copied immediately to the clipboard.

- **Paste modes and the hotkey**
   - Choose a mode from the tray menu (Default, Stack, Queue, Random).
   - **Default** – the hotkey shows/hides the popup so you can choose manually.
   - **Stack** – each hotkey press copies the newest above-the-line item and removes it; then press your normal paste shortcut.
   - **Queue** – each hotkey press copies the oldest above-the-line item and removes it (first in, first out).
   - **Random** – each hotkey press copies a random above-the-line item without removing it.

- **Changing the hotkey and history size**
   - Right-click the tray icon and choose **Settings…**.
   - Adjust the global hotkey and the maximum number of above-the-line entries, then click **Save**.
