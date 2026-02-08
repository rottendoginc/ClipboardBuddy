// Renderer for the small Settings window.
// Reads current settings via the preload bridge, lets the user edit
// hotkey and max history count, then saves and closes.
window.addEventListener('DOMContentLoaded', async () => {
  const hotkeyInput = document.getElementById('hotkey');
  const maxHistoryInput = document.getElementById('max-history');
  const saveBtn = document.getElementById('save');
  const cancelBtn = document.getElementById('cancel');

  try {
    const settings = await window.clipboardBuddy.getSettings();
    if (hotkeyInput) hotkeyInput.value = settings.hotkey || '';
    if (maxHistoryInput) maxHistoryInput.value = settings.maxHistoryItems || 200;
  } catch (err) {
    console.error('Failed to load settings', err);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const hotkey = hotkeyInput.value.trim();
      const maxHistory = parseInt(maxHistoryInput.value, 10);

      const partial = {};
      if (hotkey) partial.hotkey = hotkey;
      if (!Number.isNaN(maxHistory) && maxHistory > 0) {
        partial.maxHistoryItems = maxHistory;
      }

      try {
        await window.clipboardBuddy.updateSettings(partial);
      } catch (err) {
        console.error('Failed to save settings', err);
      }

      window.close();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.close();
    });
  }
});
