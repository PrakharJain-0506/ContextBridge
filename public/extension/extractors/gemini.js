/**
 * ContextBridge - Google Gemini Extractor
 * 
 * Extracts conversation messages from gemini.google.com / bard.google.com.
 * Targets Gemini's Angular custom elements (<user-query>, <model-response>)
 * as well as container classes and main area fallbacks.
 */

const geminiExtractor = {
  id: 'gemini',
  name: 'Google Gemini',
  hostnames: ['gemini.google.com', 'bard.google.com'],

  matches(hostname) {
    const h = (hostname || '').toLowerCase().trim();
    return this.hostnames.some(domain => h === domain || h.endsWith('.' + domain));
  },

  selectors: {
    candidateSelectors: [
      'user-query, model-response',
      '[data-testid="user-query"], [data-testid="model-response"]',
      '.user-query-container, .model-response-container',
      'div.user-query, div.model-response',
      'user-query-content, message-content',
      'main .query-text, main .model-response-text'
    ],
    ignoreElements: [
      'button',
      'svg',
      '.sr-only',
      '[aria-hidden="true"]',
      'mat-icon',
      '.mat-mdc-button',
      '[aria-label*="Listen" i]',
      '[aria-label*="Copy" i]',
      '[aria-label*="Share" i]',
      '[aria-label*="Modify" i]',
      '[aria-label*="Good response" i]',
      '[aria-label*="Bad response" i]',
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    const tag = (el.tagName || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();

    if (tag === 'user-query' || cls.includes('user-query') || el.closest('user-query')) {
      return 'user';
    }
    if (tag === 'model-response' || cls.includes('model-response') || el.closest('model-response')) {
      return 'assistant';
    }

    if (cls.includes('query') || cls.includes('user')) return 'user';
    if (cls.includes('response') || cls.includes('model') || el.querySelector('.markdown') || el.querySelector('message-content')) {
      return 'assistant';
    }

    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting Google Gemini conversation detection on: "${window.location.hostname}"`);

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

    // Strategy 1: Target Angular Custom Elements (<user-query>, <model-response>)
    const customNodes = Array.from(
      document.querySelectorAll('user-query, model-response, .user-query-container, .model-response-container')
    ).filter(el => !el.closest('#contextbridge-overlay-root'));

    if (customNodes.length > 0) {
      // Deduplicate nested elements
      const deduped = customNodes.filter(el => {
        return !customNodes.some(other => other !== el && other.contains(el));
      });

      const sortedNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(deduped);
      const seenTexts = new Set();

      sortedNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);

        // In Gemini, user query text is in .query-text or user-query-content
        // Model response text is in .model-response-text, message-content, or markdown
        let contentNode = node;
        if (role === 'user') {
          const userTextNode = node.querySelector('.query-text') || node.querySelector('user-query-content') || node;
          contentNode = userTextNode;
        } else {
          const modelTextNode = node.querySelector('.model-response-text') || node.querySelector('message-content') || node.querySelector('.markdown') || node;
          contentNode = modelTextNode;
        }

        const text = window.ContextBridgeCommon.extractCleanMessageText(contentNode, this.selectors.ignoreElements);
        if (window.ContextBridgeCommon.isMeaningfulContent(text, ['Ask Gemini', 'Gemini may display inaccurate info']) && !seenTexts.has(text)) {
          seenTexts.add(text);
          extractedMessages.push({
            id: `msg-${extractedMessages.length + 1}`,
            role: role,
            content: text
          });
        }
      });

      if (extractedMessages.length > 0) {
        extractionMethod = 'Gemini Custom Elements (<user-query>, <model-response>)';
      }
    }

    // Strategy 2: Fallback to message containers within main chat feed
    if (extractedMessages.length === 0) {
      const turnSelector = 'main [class*="query"], main [class*="response"], main message-content, main .conversation-container';
      const candidateTurns = Array.from(document.querySelectorAll(turnSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'))
        .filter(el => !el.closest('header, nav, aside, rich-textarea'));

      if (candidateTurns.length > 0) {
        const dedupedTurns = candidateTurns.filter(el => {
          return !candidateTurns.some(other => other !== el && other.contains(el));
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
          extractionMethod = 'Gemini Feed Containers Fallback';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid Gemini conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the Gemini conversation turn selectors matched elements in the DOM. (The page may still be loading, or it may be a new chat).';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid conversational text.`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'Gemini');

    return {
      platform: 'gemini',
      platformName: 'Google Gemini',
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
  window.ContextBridgeGemini = geminiExtractor;
}
