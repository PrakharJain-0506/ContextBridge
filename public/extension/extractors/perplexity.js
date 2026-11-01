/**
 * ContextBridge - Perplexity Extractor
 * 
 * Extracts conversation threads from perplexity.ai.
 * Targets user query headers ([data-testid="user-query"], h1.font-display)
 * and answer markdown blocks ([id^="markdown-content-"], div.prose).
 */

const perplexityExtractor = {
  id: 'perplexity',
  name: 'Perplexity',
  hostnames: ['perplexity.ai'],

  matches(hostname) {
    const h = (hostname || '').toLowerCase().trim();
    return this.hostnames.some(domain => h === domain || h.endsWith('.' + domain));
  },

  selectors: {
    candidateSelectors: [
      '[data-testid="user-query"], [id^="markdown-content-"]',
      'h1[class*="query"], div[class*="query"], div.prose',
      'main .font-display, main [class*="answer"]',
      '[data-testid="thread-container"]'
    ],
    ignoreElements: [
      'button',
      'svg',
      '.sr-only',
      '[aria-hidden="true"]',
      '[class*="citation"]',
      '[class*="source"]',
      'a[href^="http"]',
      '[data-testid*="follow-up"]',
      '[aria-label*="Copy" i]',
      '[aria-label*="Share" i]',
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const tag = (el.tagName || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();

    if (testId.includes('user') || tag === 'h1' || cls.includes('query')) {
      return 'user';
    }
    if (id.startsWith('markdown-content') || cls.includes('prose') || cls.includes('answer')) {
      return 'assistant';
    }

    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting Perplexity conversation detection on: "${window.location.hostname}"`);

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

    // Strategy 1: Target Question Headers & Answer Markdown Blocks
    const targetSelector = '[data-testid="user-query"], [id^="markdown-content-"], h1[class*="query"], h1.font-display, main div.prose, main div[class*="prose"]';
    const rawNodes = Array.from(document.querySelectorAll(targetSelector))
      .filter(el => !el.closest('#contextbridge-overlay-root'))
      .filter(el => !el.closest('header, nav, aside, form'));

    if (rawNodes.length > 0) {
      // Deduplicate nested elements
      const deduped = rawNodes.filter(el => {
        return !rawNodes.some(other => other !== el && other.contains(el));
      });

      const sortedNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(deduped);
      const seenTexts = new Set();

      sortedNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);
        const text = window.ContextBridgeCommon.extractCleanMessageText(node, this.selectors.ignoreElements);
        if (window.ContextBridgeCommon.isMeaningfulContent(text, ['Ask follow-up', 'Perplexity']) && !seenTexts.has(text)) {
          seenTexts.add(text);
          extractedMessages.push({
            id: `msg-${extractedMessages.length + 1}`,
            role: role,
            content: text
          });
        }
      });

      if (extractedMessages.length > 0) {
        extractionMethod = 'Perplexity Query Headers & Markdown Blocks';
      }
    }

    // Strategy 2: Fallback to main thread blocks
    if (extractedMessages.length === 0) {
      const mainChatArea = document.querySelector('main') || document.querySelector('[role="main"]');
      if (mainChatArea) {
        const threadBlocks = Array.from(
          mainChatArea.querySelectorAll('[class*="divide-y"] > div, .font-display, [class*="answer"]')
        ).filter(el => !el.closest('#contextbridge-overlay-root'));

        const sortedBlocks = window.ContextBridgeCommon.sortElementsInDocumentOrder(threadBlocks);
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
          extractionMethod = 'Perplexity Thread Blocks Fallback';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid Perplexity conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the Perplexity conversation turn selectors matched elements in the DOM.';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid conversational text.`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'Perplexity');

    return {
      platform: 'perplexity',
      platformName: 'Perplexity',
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
  window.ContextBridgePerplexity = perplexityExtractor;
}
