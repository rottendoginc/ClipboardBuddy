// Renderer logic for the main popup window.
// Renders above/below history lists, wires click handlers, and requests
// popup height adjustments from the main process based on content size.
let lastStateJson = '';

function createItemElement(text, isMultiline, options) {
  const { onSelect, onDelete, showDelete } = options || {};

  const wrapper = document.createElement('div');
  wrapper.className = 'item';

  const row = document.createElement('div');
  row.className = 'item-row' + (isMultiline ? ' multiline' : '');

  const textDiv = document.createElement('div');
  textDiv.className = 'item-text';
  textDiv.textContent = text.split(/\r?\n/)[0] || '(empty)';
  textDiv.title = text;

  if (onSelect) {
    row.addEventListener('click', onSelect);
  }

  row.appendChild(textDiv);

  if (showDelete && onDelete) {
    const buttons = document.createElement('div');
    buttons.className = 'item-buttons';

    const delBtn = document.createElement('button');
    delBtn.className = 'item-button';
    delBtn.textContent = '✕';
    delBtn.title = 'Remove this snippet';
    delBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onDelete();
    });

    buttons.appendChild(delBtn);
    row.appendChild(buttons);
  }

  wrapper.appendChild(row);
  return wrapper;
}

async function renderHistory() {
  const aboveContainer = document.getElementById('above-list');
  const belowContainer = document.getElementById('below-list');
  const container = document.querySelector('.list-container');
  if (!aboveContainer || !belowContainer) return;

  let state;
  try {
    state = await window.clipboardBuddy.getHistory();
  } catch (err) {
    aboveContainer.textContent = 'Failed to load history.';
    console.error(err);
    return;
  }

  const stateJson = JSON.stringify(state || {});
  if (stateJson === lastStateJson) {
    return; // No changes, avoid re-render to prevent flicker.
  }
  lastStateJson = stateJson;

  // Only clear and rebuild the DOM when the history state actually changed
  aboveContainer.innerHTML = '';
  belowContainer.innerHTML = '';

  const { aboveItems = [], belowItems = [] } = state || {};

  if (aboveItems.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Copy some text to build your recent history…';
    aboveContainer.appendChild(placeholder);
  } else {
    aboveItems.forEach((text, index) => {
      const isMultiline = /\r?\n/.test(text);
      const el = createItemElement(text, isMultiline, {
        onSelect: () => {
          window.clipboardBuddy.selectItem({ region: 'above', index });
        },
        showDelete: false
      });
      aboveContainer.appendChild(el);
    });
  }

  if (belowItems.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Use + to save the current clipboard as a snippet.';
    belowContainer.appendChild(placeholder);
  } else {
    belowItems.forEach((text, index) => {
      const isMultiline = /\r?\n/.test(text);
      const el = createItemElement(text, isMultiline, {
        onSelect: () => {
          window.clipboardBuddy.selectItem({ region: 'below', index });
        },
        showDelete: true,
        onDelete: () => {
          window.clipboardBuddy.removePersistent(index);
        }
      });
      belowContainer.appendChild(el);
    });
  }

  // After rendering, ask main process to resize popup to fit content
  if (container && window.clipboardBuddy.setPopupHeight) {
    const rect = container.getBoundingClientRect();
    const desired = rect.height + 16; // small margin
    window.clipboardBuddy.setPopupHeight(desired);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Initial render plus a lightweight polling loop while window is open.
  renderHistory();
  // Periodically refresh while the window is open so new copies show up.
  setInterval(renderHistory, 1000);

   const addBtn = document.getElementById('add-clipboard');
   if (addBtn) {
     addBtn.addEventListener('click', async () => {
       try {
         await window.clipboardBuddy.addPersistentFromClipboard();
         // Force immediate refresh
         lastStateJson = '';
         renderHistory();
       } catch (err) {
         console.error('Failed to add persistent snippet', err);
       }
     });
   }
});
