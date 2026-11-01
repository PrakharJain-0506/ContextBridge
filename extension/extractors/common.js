/**
 * ContextBridge - Common Extractor Utilities
 * 
 * Shared, side-effect-free DOM inspection and text-cleaning functions
 * used by all AI platform extractors.
 */

/**
 * Validates that extracted text has meaningful conversational content
 * and is not mere UI placeholder or boilerplate chrome.
 */
function isMeaningfulContent(text, extraBoilerplate = []) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 2) return false;

  const defaultBoilerplate = [
    'ChatGPT can make mistakes. Check important info.',
    'Search the web',
    'Message ChatGPT',
    'ChatGPT',
    'Copy code',
    'Good response',
    'Bad response',
    'Ask Gemini',
    'Gemini may display inaccurate info',
    'Claude is AI and can make mistakes',
    'Perplexity',
    'Ask follow-up',
    'Copilot may make mistakes',
    'Grok can make mistakes'
  ];

  const allBoilerplate = [...defaultBoilerplate, ...extraBoilerplate];
  if (allBoilerplate.some(b => clean.toLowerCase() === b.toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * Cleanly extracts message text while preserving code blocks with markdown fences,
 * lists, and paragraph breaks, while stripping buttons, action bars, and screen reader text.
 */
function extractCleanMessageText(node, customIgnoreSelectors = []) {
  if (!node) return '';

  // Deep clone so the live webpage DOM is never mutated
  const clone = node.cloneNode(true);

  const defaultIgnore = [
    'button',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '[data-testid*="action-button"]',
    '[data-testid*="copy-turn-action-button"]',
    '[aria-label="Copy"]',
    '[aria-label="Read aloud"]',
    '[aria-label="Good response"]',
    '[aria-label="Bad response"]',
    '[aria-label*="copy" i]',
    '[aria-label*="listen" i]',
    '[aria-label*="thumbs" i]',
    '[class*="agent-turn-actions"]',
    '[class*="citation"]',
    '#contextbridge-overlay-root'
  ];

  const ignoreSelectors = [...defaultIgnore, ...customIgnoreSelectors];

  ignoreSelectors.forEach(selector => {
    try {
      const matches = clone.querySelectorAll(selector);
      matches.forEach(el => el.remove());
    } catch (e) {
      // Ignore selector syntax edge cases
    }
  });

  // Preserve code blocks (<pre>): format nicely with markdown code fences
  try {
    const codeBlocks = clone.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      let lang = '';
      const codeEl = pre.querySelector('code');
      if (codeEl) {
        const match = (codeEl.className || '').match(/language-([a-zA-Z0-9_\-#+]+)/);
        if (match) lang = match[1];
      }
      const codeText = (codeEl ? codeEl.textContent : pre.textContent) || '';
      const replacement = document.createTextNode(`\n\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`);
      if (pre.parentNode) {
        pre.parentNode.replaceChild(replacement, pre);
      }
    });
  } catch (e) {
    // Continue if code block transform encounters unexpected nodes
  }

  // Extract text using innerText (preserves linebreaks and paragraph spacing)
  let text = clone.innerText !== undefined ? clone.innerText : clone.textContent || '';

  // Normalize excess blank lines (max 2 consecutive newlines) and trim
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * Sorts DOM elements by natural document position to preserve chronological order
 */
function sortElementsInDocumentOrder(elements) {
  return Array.from(elements).sort((a, b) => {
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

/**
 * Cleans the page title by stripping platform-specific suffixes
 */
function cleanPageTitle(rawTitle, platformPattern = '') {
  let title = (rawTitle || '').trim();
  if (platformPattern) {
    title = title.replace(new RegExp(`\\s*[-–|]\\s*${platformPattern}.*$`, 'i'), '');
    title = title.replace(new RegExp(`^${platformPattern}\\s*[-–|]\\s*`, 'i'), '');
  }
  title = title
    .replace(/\s*[-–|]\s*(ChatGPT|Gemini|Claude|Perplexity|Copilot|Grok).*$/i, '')
    .trim();
  return title || 'Active AI Session';
}

if (typeof window !== 'undefined') {
  window.ContextBridgeCommon = {
    isMeaningfulContent,
    extractCleanMessageText,
    sortElementsInDocumentOrder,
    cleanPageTitle
  };
}
