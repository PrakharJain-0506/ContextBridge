/**
 * ContextBridge - Microsoft Copilot Extractor
 * 
 * Extracts conversation exchanges from copilot.microsoft.com and bing.com/chat.
 * Targets Copilot's CIB custom elements (cib-chat-turn, cib-message-group)
 * and data-author message containers.
 */

const copilotExtractor = {
  id: 'copilot',
  name: 'Microsoft Copilot',
  hostnames: ['copilot.microsoft.com', 'bing.com'],

  matches(hostname, pathname = '') {
    const h = (hostname || '').toLowerCase().trim();
    const p = (pathname || '').toLowerCase();
    if (h === 'copilot.microsoft.com' || h.endsWith('.copilot.microsoft.com')) {
      return true;
    }
    if (h === 'bing.com' || h.endsWith('.bing.com')) {
      return p.startsWith('/chat') || p.startsWith('/copilot') || window.location.search.includes('q=Bing+AI');
    }
    return false;
  },

  selectors: {
    candidateSelectors: [
      'cib-chat-turn, cib-message-group',
      'div[data-author="user"], div[data-author="bot"]',
      '[data-testid="user-message"], [data-testid="bot-message"]',
      '[data-testid="chat-page"] .message-container',
      'div[class*="message-container"]',
      'main [data-author]'
    ],
    ignoreElements: [
      'button',
      'svg',
      '.sr-only',
      '[aria-hidden="true"]',
      '[class*="suggestion"]',
      '[class*="feedback"]',
      '[class*="cib-action-menu"]',
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    const author = (el.getAttribute('data-author') || el.getAttribute('type') || '').toLowerCase();
    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();

    if (author === 'user' || testId.includes('user') || cls.includes('user')) {
      return 'user';
    }
    if (author === 'bot' || author === 'assistant' || testId.includes('bot') || testId.includes('copilot') || cls.includes('bot')) {
      return 'assistant';
    }

    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting Microsoft Copilot conversation detection on: "${window.location.hostname}"`);

    // 1. Evaluate candidate selectors and log results
    const selectorCounts = {};
    this.selectors.candidateSelectors.forEach(sel => {
      try {
        const found = document.querySelectorAll(sel);
        const valid = Array.from(found).filter(el => !el.closest('#contextbridge-overlay-root'));
        selectorCounts[sel] = valid.length;
      } catch (err) {
        selectorCounts[sel] = 0;
      }
      console.log(`[ContextBridge] Selector "${sel}" found ${selectorCounts[sel]} element(s)`);
    });

    let extractedMessages = [];
    let extractionMethod = null;

    // Strategy 1: Target explicit data-author or testid message containers
    const targetSelector = 'div[data-author="user"], div[data-author="bot"], [data-testid="user-message"], [data-testid="bot-message"], [data-author]';
    const messageNodes = Array.from(document.querySelectorAll(targetSelector))
      .filter(el => !el.closest('#contextbridge-overlay-root'))
      .filter(el => !el.closest('header, nav, aside'));

    if (messageNodes.length > 0) {
      const deduped = messageNodes.filter(el => {
        return !messageNodes.some(other => other !== el && other.contains(el));
      });

      const sortedNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(deduped);
      const seenTexts = new Set();

      sortedNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);
        const text = window.ContextBridgeCommon.extractCleanMessageText(node, this.selectors.ignoreElements);
        if (window.ContextBridgeCommon.isMeaningfulContent(text, ['Copilot may make mistakes']) && !seenTexts.has(text)) {
          seenTexts.add(text);
          extractedMessages.push({
            id: `msg-${extractedMessages.length + 1}`,
            role: role,
            content: text
          });
        }
      });

      if (extractedMessages.length > 0) {
        extractionMethod = 'Copilot data-author Message Elements';
      }
    }

    // Strategy 2: Target CIB custom turns or message groups
    if (extractedMessages.length === 0) {
      const cibTurns = Array.from(document.querySelectorAll('cib-chat-turn, cib-message-group, [class*="chat-turn"], div[class*="message-container"]'))
        .filter(el => !el.closest('#contextbridge-overlay-root'));

      if (cibTurns.length > 0) {
        const dedupedTurns = cibTurns.filter(el => {
          return !cibTurns.some(other => other !== el && other.contains(el));
        });

        const sortedTurns = window.ContextBridgeCommon.sortElementsInDocumentOrder(dedupedTurns);
        const seenTexts = new Set();

        sortedTurns.forEach((turn, idx) => {
          const role = this.resolveRole(turn, idx);
          const text = window.ContextBridgeCommon.extractCleanMessageText(turn, this.selectors.ignoreElements);
          if (window.ContextBridgeCommon.isMeaningfulContent(text) && !seenTexts.has(text)) {
            seenTexts.add(text);
            extractedMessages.push({
              id: `msg-${extractedMessages.length + 1}`,
              role: role,
              content: text
            });
          }
        });

        if (extractedMessages.length > 0) {
          extractionMethod = 'Copilot CIB Chat Turns Fallback';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid Microsoft Copilot conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the Copilot conversation selectors matched elements in the DOM.';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid conversational text.`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'Copilot');

    return {
      platform: 'copilot',
      platformName: 'Microsoft Copilot',
      detected: extractedMessages.length > 0,
      pageTitle: pageTitle,
      url: window.location.href,
      capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: extractedMessages,
      messageCount: extractedMessages.length,
      turnCount: Math.ceil(extractedMessages.length / 2),
      isPartial: true,
      sourceNotice: 'ContextBridge captured the conversation currently loaded on this page.'
    };
  }
};

if (typeof window !== 'undefined') {
  window.ContextBridgeCopilot = copilotExtractor;
}
