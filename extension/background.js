/**
 * ContextBridge - Service Worker (Manifest V3)
 * 
 * Manages extension action clicks and hotkeys to trigger the in-page overlay
 * on the currently active tab.
 */

// Listen for clicks on the extension toolbar icon
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await toggleOverlayOnTab(tab);
});

// Listen for keyboard command shortcuts (e.g. Command+Shift+K)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await toggleOverlayOnTab(tab);
    }
  }
});

/**
 * Toggles the in-page overlay on the specified tab.
 * If the content script is not yet injected (e.g. on pages opened prior to installation),
 * it dynamically injects the script and stylesheet before sending the toggle command.
 */
async function toggleOverlayOnTab(tab) {
  // Prevent injection on restricted browser internal pages
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    console.warn('[ContextBridge] Cannot inject overlay on browser internal pages:', tab.url);
    return;
  }

  try {
    // Attempt to ping the existing content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_CONTEXTBRIDGE_OVERLAY'
    });
    if (response && response.status === 'ok') {
      return;
    }
  } catch (err) {
    // If sendMessage failed, content script is not active yet on this tab; inject it dynamically
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send the toggle message once injected
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_CONTEXTBRIDGE_OVERLAY'
      });
    } catch (injectionError) {
      console.error('[ContextBridge] Failed to inject overlay into active tab:', injectionError);
    }
  }
}
