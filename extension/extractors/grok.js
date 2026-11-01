/**
 * ContextBridge - Grok Extractor
 * 
 * Extracts conversation exchanges from grok.com and x.com/i/grok / twitter.com/i/grok.
 * Targets Grok's message bubbles, response-content-markdown, and prose containers.
 */

const grokExtractor = {
  id: 'grok',
  name: 'Grok',
  hostnames: ['grok.com', 'x.com', 'twitter.com'],

  matches(hostname, pathname = '') {
    const h = (hostname || '').toLowerCase().trim();
    const p = (pathname || '').toLowerCase();
    if (h === 'grok.com' || h.endsWith('.grok.com')) {
      return true;
    }
    if (h === 'x.com' || h.endsWith('.x.com') || h === 'twitter.com' || h.endsWith('.twitter.com')) {
      return p.includes('/i/grok') || p.includes('/grok');
    }
    return false;
  },

  selectors: {
    candidateSelectors: [
      'div[class*="message-bubble"], .response-content-markdown',
      'div[class*="user-message"], div[class*="response"]',
      '[data-testid="grokMessage"], [data-testid="tweetText"]',
      'main div.prose, main [class*="prose"]',
      'main [class*="message"]'
    ],
    ignoreElements: [
      'button',
      'svg',
      '.sr-only',
      '[aria-hidden="true"]',
      '[data-testid*="sidebar"]',
      '[role="navigation"]',
      '[class*="thought"]',
      '[aria-label*="Thought for" i]',
      '[aria-label*="Copy" i]',
      '[aria-label*="Share" i]',
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    const cls = (el.className || '').toString().toLowerCase();
    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const roleAttr = (el.getAttribute('data-role') || '').toLowerCase();

    if (roleAttr === 'user' || cls.includes('user-message') || cls.includes('user') || testId.includes('user')) {
      return 'user';
    }
    if (roleAttr === 'assistant' || cls.includes('response') || cls.includes('prose') || testId.includes('grok')) {
      return 'assistant';
    }

    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting Grok conversation detection on: "${window.location.hostname}"`);

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

    // Strategy 1: Target message bubbles & markdown response containers
    const targetSelector = 'div[class*="message-bubble"], .response-content-markdown, div[class*="user-message"], [data-testid="grokMessage"], main div.prose';
    const messageNodes = Array.from(document.querySelectorAll(targetSelector))
      .filter(el => !el.closest('#contextbridge-overlay-root'))
      .filter(el => !el.closest('header, nav, aside, form, [data-testid*="sidebar"]'));

    if (messageNodes.length > 0) {
      const deduped = messageNodes.filter(el => {
        return !messageNodes.some(other => other !== el && other.contains(el));
      });

      const sortedNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(deduped);
      const seenTexts = new Set();

      sortedNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);
        const text = window.ContextBridgeCommon.extractCleanMessageText(node, this.selectors.ignoreElements);
        if (window.ContextBridgeCommon.isMeaningfulContent(text, ['Grok can make mistakes', 'Thought for']) && !seenTexts.has(text)) {
          seenTexts.add(text);
          extractedMessages.push({
            id: `msg-${extractedMessages.length + 1}`,
            role: role,
            content: text
          });
        }
      });

      if (extractedMessages.length > 0) {
        extractionMethod = 'Grok Message Bubbles & Markdown Responses';
      }
    }

    // Strategy 2: Fallback to main chat containers
    if (extractedMessages.length === 0) {
      const mainChatArea = document.querySelector('main') || document.querySelector('[role="main"]');
      if (mainChatArea) {
        const candidateBlocks = Array.from(
          mainChatArea.querySelectorAll('[class*="message"], [class*="prose"], [class*="bubble"]')
        ).filter(el => !el.closest('#contextbridge-overlay-root'))
         .filter(el => !el.closest('header, nav, aside, form'));

        const sortedBlocks = window.ContextBridgeCommon.sortElementsInDocumentOrder(candidateBlocks);
        const seenTexts = new Set();

        sortedBlocks.forEach((block, idx) => {
          const role = this.resolveRole(block, idx);
          const text = window.ContextBridgeCommon.extractCleanMessageText(block, this.selectors.ignoreElements);
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
          extractionMethod = 'Grok Main Conversation Area Fallback';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid Grok conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the Grok conversation selectors matched elements in the DOM.';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid conversational text.`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'Grok');

    return {
      platform: 'grok',
      platformName: 'Grok',
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
  window.ContextBridgeGrok = grokExtractor;
}
