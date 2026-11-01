/**
 * ContextBridge - ChatGPT Extractor
 * 
 * Extracts conversation messages from chatgpt.com / chat.openai.com.
 * Preserves the exact, verified multi-selector evaluation, role prioritization,
 * turn containers, and main area fallback logic.
 */

const chatgptExtractor = {
  id: 'chatgpt',
  name: 'ChatGPT',
  hostnames: ['chatgpt.com', 'chat.openai.com'],

  matches(hostname) {
    const h = (hostname || '').toLowerCase().trim();
    return this.hostnames.some(domain => h === domain || h.endsWith('.' + domain));
  },

  selectors: {
    candidateSelectors: [
      '[data-message-author-role]',
      'article[data-testid^="conversation-turn-"]',
      'div[data-testid^="conversation-turn-"]',
      '[data-testid^="conversation-turn-"]',
      'main article'
    ],
    roleAttribute: 'data-message-author-role',
    ignoreElements: [
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
      '#contextbridge-overlay-root'
    ]
  },

  resolveRole(el, fallbackIndex = 0) {
    if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';

    // 1. Direct role attribute on element or descendant
    if (el.hasAttribute && el.hasAttribute(this.selectors.roleAttribute)) {
      const attr = (el.getAttribute(this.selectors.roleAttribute) || '').toLowerCase();
      if (attr === 'assistant') return 'assistant';
      if (attr === 'user') return 'user';
    }
    const roleChild = el.querySelector ? el.querySelector(`[${this.selectors.roleAttribute}]`) : null;
    if (roleChild) {
      const attr = (roleChild.getAttribute(this.selectors.roleAttribute) || '').toLowerCase();
      if (attr === 'assistant') return 'assistant';
      if (attr === 'user') return 'user';
    }

    // 2. Class / content markers
    if (el.querySelector) {
      if (el.querySelector('.markdown') || el.querySelector('[data-testid="agent-turn"]') || (el.classList && el.classList.contains('agent-turn'))) {
        return 'assistant';
      }
      if (el.querySelector('[class*="user-message"]') || el.querySelector('.whitespace-pre-wrap')) {
        return 'user';
      }
    }

    // 3. Positional fallback
    return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
  },

  extract() {
    console.log(`[ContextBridge] Starting ChatGPT conversation detection on: "${window.location.hostname}"`);

    // 1. Evaluate all candidate selectors and log counts
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

    // Strategy 1: Prioritize role-based detection ([data-message-author-role])
    const roleNodes = Array.from(
      document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"], [data-message-author-role]')
    ).filter(el => !el.closest('#contextbridge-overlay-root'));

    if (roleNodes.length > 0) {
      const sortedRoleNodes = window.ContextBridgeCommon.sortElementsInDocumentOrder(roleNodes);
      const seenTexts = new Set();

      sortedRoleNodes.forEach((node, idx) => {
        const role = this.resolveRole(node, idx);
        const text = window.ContextBridgeCommon.extractCleanMessageText(node, this.selectors.ignoreElements);
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
        extractionMethod = 'Role-based ([data-message-author-role])';
      }
    }

    // Strategy 2: If role-based extraction yielded no valid messages, evaluate turn containers
    if (extractedMessages.length === 0) {
      const turnSelector = 'article[data-testid^="conversation-turn-"], div[data-testid^="conversation-turn-"], [data-testid^="conversation-turn-"], main article';
      const rawTurnNodes = Array.from(document.querySelectorAll(turnSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'));

      if (rawTurnNodes.length > 0) {
        const dedupedTurns = rawTurnNodes.filter(el => {
          return !rawTurnNodes.some(other => other !== el && other.contains(el));
        });

        const sortedTurns = window.ContextBridgeCommon.sortElementsInDocumentOrder(dedupedTurns);
        const seenTexts = new Set();

        sortedTurns.forEach((turn, idx) => {
          const role = this.resolveRole(turn, idx);

          let contentNode = turn;
          if (role === 'assistant') {
            const md = turn.querySelector('.markdown') || turn.querySelector('[class*="prose"]');
            if (md) contentNode = md;
          } else {
            const userBox = turn.querySelector('.whitespace-pre-wrap') || turn.querySelector('[class*="user-message"]');
            if (userBox) contentNode = userBox;
          }

          const text = window.ContextBridgeCommon.extractCleanMessageText(contentNode, this.selectors.ignoreElements);
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
          extractionMethod = 'Turn Containers (articles / testids)';
        }
      }
    }

    // Strategy 3: Robust fallback inside the main chat area
    if (extractedMessages.length === 0) {
      const mainChatArea = document.querySelector('main') || document.querySelector('[role="main"]');
      if (mainChatArea) {
        const candidateBlocks = Array.from(
          mainChatArea.querySelectorAll('.markdown, [class*="markdown"], .whitespace-pre-wrap, [class*="user-message"], [class*="agent-turn"]')
        ).filter(el => {
          if (el.closest('#contextbridge-overlay-root')) return false;
          if (el.closest('header, nav, aside, form, footer, [role="navigation"]')) return false;
          return true;
        });

        const dedupedBlocks = candidateBlocks.filter(el => {
          return !candidateBlocks.some(other => other !== el && other.contains(el));
        });

        const sortedBlocks = window.ContextBridgeCommon.sortElementsInDocumentOrder(dedupedBlocks);
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
          extractionMethod = 'Main Chat Area Fallback (prose & text containers)';
        }
      }
    }

    // Diagnostic logging
    if (extractedMessages.length > 0) {
      console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
      console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
    } else {
      let failReason = 'No valid conversation elements found.';
      const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
      if (totalElementsFound === 0) {
        failReason = 'None of the conversation turn selectors matched elements in the DOM. The page may still be loading, or you might be on an empty/new chat screen.';
      } else {
        failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid, meaningful text (elements were empty wrappers, skeletons, or UI chrome).`;
      }
      console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
    }

    const pageTitle = window.ContextBridgeCommon.cleanPageTitle(document.title, 'ChatGPT');

    return {
      platform: 'chatgpt',
      platformName: 'ChatGPT',
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
  window.ContextBridgeChatGPT = chatgptExtractor;
}
