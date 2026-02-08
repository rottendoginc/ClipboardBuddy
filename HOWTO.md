# Clipboard Buddy – Quick How-To

## Basics
- Start the app with `npm start` (from the ClipboardBuddy folder).
- A tray icon appears; use your configured hotkey (default: Ctrl+Alt+V or Cmd+Alt+V) to open the popup next to your mouse cursor.

## Above vs Below the Line
- **Above the line**
  - Shows recent clipboard text you have copied.
  - Temporary: cleared when you quit Clipboard Buddy.
  - Consecutive duplicates are not added.
- **Below the line**
  - Shows your saved, persistent snippets.
  - Stored in a JSON file and survives restarts.

## Adding a Persistent Item
1. Copy some text in any application.
2. Press the Clipboard Buddy hotkey to open the popup (Default mode).
3. Click the **+** button in the lower-right of the popup.
4. The current clipboard text appears **below the line** as a persistent item.

To remove a persistent item, click the small **✕** button next to it.

## Selecting and Pasting
- In the popup:
  - Click any item (above or below) to copy it to the clipboard, then paste as usual (e.g. Ctrl+V).
- From the tray menu:
  - Choose any item from the history section at the top; it is copied immediately to the clipboard.

## Modes (Tray → Modes)
- **Default**
  - Hotkey toggles the popup so you can choose manually.
- **Stack**
  - Hotkey copies the newest above-the-line item and removes it (last in, first out).
- **Queue**
  - Hotkey copies the oldest above-the-line item and removes it (first in, first out).
- **Random**
  - Hotkey copies a random above-the-line item without removing it.

## Settings
- Right-click the tray icon and choose **Settings…**.
- You can change:
  - The global hotkey accelerator.
  - The maximum number of above-the-line history entries.
