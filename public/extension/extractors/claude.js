/**
 * ContextBridge - Claude Extractor
 * 
 * Extracts conversation messages from claude.ai.
 * Targets Claude's React test IDs ([data-testid="user-message"], [data-testid="assistant-message"])
 * and typography identifiers (.font-user-message, .font-claude-message).
 */

const claudeExtractor = {
  id: 'claude',
  name: 'Claude',
  hostnames: ['claude.ai'],

  matches(hostname) {
    const h = (hostname || '').toLowerCase().trim();
    return this.hostnames.some(domain => h === domain || h.endsWith('.' + domain));
  },

  selectors: {
    candidateSelectors: [
      '[data-testid="user-message"], [data-testid="assistant-message"]',
      '.font-user-message, .font-claude-message',
      '[data-testid="chat-message-content"]',
      '[data-testid="conversation-turn"]',
      'div[data-is-streaming]',
      'main .grid [class*="font-"]'
    ],
    ignoreElements: [
      'button',
      'svg',
      '.sr-only',
      '[aria-hidden="true"]',
      '[aria-label*="Copy" i]',
      '[aria-label*="Retry" i]',
      '[data-testid*="feedback"]',
      '[data-testid*="action"]',
      '[class*="artifact-panel"]',
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();

    if (testId === 'user-message' || cls.includes('font-user-message') || el.closest('[data-testid="user-message"]')) {
      return 'user';
    }
    if (testId === 'assistant-message' || cls.includes('font-claude-message') || cls.includes('font-claude') || el.closest('[data-testid="assistant-message"]')) {
      return 'assistant';
    }

    if (testId.includes('user') || cls.includes('user')) return 'user';
    if (testId.includes('assistant') || cls.includes('claude') || cls.includes('assistant')) return 'assistant';

    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting Claude conversation detection on: "${window.location.hostname}"`);

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

    // Strategy 1: Prioritize explicit message test IDs & typography markers
    const messageNodes = Array.from(
      document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"], .font-user-message, .font-claude-message, [class*="font-claude-message"]')
    ).filter(el => !el.closest('#contextbridge-overlay-root'));

    if (messageNodes.length > 0) {
      // Deduplicate nested elements
      const deduped = messageNodes.filter(el => {
        return !messageNodes.some(other => other !== el && other.contains(el));
      });

      const sortedNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(deduped);
      const seenTexts = new Set();

      sortedNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);
        const text = window.ContextBridgeCommon.extractCleanMessageText(node, this.selectors.ignoreElements);
        if (window.ContextBridgeCommon.isMeaningfulContent(text, ['Claude is AI and can make mistakes']) && !seenTexts.has(text)) {
          seenTexts.add(text);
          extractedMessages.push({
            id: `msg-${extractedMessages.length + 1}`,
            role: role,
            content: text
          });
        }
      });

      if (extractedMessages.length > 0) {
        extractionMethod = 'Claude TestIDs & Typography Markers';
      }
    }

    // Strategy 2: Fallback to conversation turn containers
    if (extractedMessages.length === 0) {
      const turnSelector = '[data-testid="conversation-turn"], [data-testid="chat-message-content"], main .grid';
      const turnNodes = Array.from(document.querySelectorAll(turnSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'))
        .filter(el => !el.closest('header, nav, aside, form'));

      if (turnNodes.length > 0) {
        const dedupedTurns = turnNodes.filter(el => {
          return !turnNodes.some(other => other !== el && other.contains(el));
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
          extractionMethod = 'Claude Conversation Turn Fallback';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid Claude conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the Claude conversation turn selectors matched elements in the DOM. (The page may still be loading, or it may be a new chat).';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid conversational text.`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'Claude');

    return {
      platform: 'claude',
      platformName: 'Claude',
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
  window.ContextBridgeClaude = claudeExtractor;
}
