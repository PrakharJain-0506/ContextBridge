/**
 * ContextBridge - In-Page Overlay Content Script (Manifest V3)
 * 
 * Injects and manages the floating ContextBridge Lens modal directly over the user's
 * active webpage using Shadow DOM for style isolation and seamless cross-AI portability.
 */

(function () {
  // Prevent duplicate script execution
  if (window.__CONTEXTBRIDGE_INJECTED__) {
    return;
  }
  window.__CONTEXTBRIDGE_INJECTED__ = true;

  const STORAGE_KEY = 'contextbridge_saved_items';
  const THEME_KEY = 'contextbridge_theme_preference';

  let shadowRoot = null;
  let overlayHost = null;
  let isVisible = false;
  let currentTheme = 'dark'; // 'dark' (Fluid Glass) or 'light' (Glass Flow)
  let activeTabName = window.location.hostname || 'active-tab';

  let currentEditingId = null;
  let savedContexts = [];
  let currentView = 'capture'; // 'capture' | 'preview' | 'saved'

  // Form state
  let state = {
    projectName: '',
    currentTask: '',
    importantContext: '',
    workCompleted: '',
    nextSteps: '',
    format: 'standard'
  };

  // =========================================================================
  // MULTI-PLATFORM AI EXTRACTORS & REGISTRY
  // Modular architecture supporting ChatGPT, Google Gemini, Claude, Perplexity,
  // Microsoft Copilot, and Grok with normalized common conversation format.
  // =========================================================================

  // Shared Extractor Utilities
  const CommonExtractorUtils = {
    isMeaningfulContent(text, extraBoilerplate = []) {
      if (!text || typeof text !== 'string') return false;
      const clean = text.trim();
      if (clean.length < 2) return false;

      const defaultBoilerplate = [
        'ChatGPT can make mistakes. Check important info.',
        'Search the web',
        'Message ChatGPT',
        'ChatGPT',
        'Copy code',
        'Ask Gemini',
        'Gemini may display inaccurate info',
        'Claude is AI and can make mistakes',
        'Perplexity',
        'Ask follow-up',
        'Copilot may make mistakes',
        'Grok can make mistakes'
      ];
      const all = [...defaultBoilerplate, ...extraBoilerplate];
      return !all.some(b => clean.toLowerCase() === b.toLowerCase());
    },

    extractCleanMessageText(node, customIgnoreSelectors = []) {
      if (!node) return '';
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
        } catch (e) {}
      });

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
      } catch (e) {}

      let text = clone.innerText !== undefined ? clone.innerText : clone.textContent || '';
      return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    },

    sortElementsInDocumentOrder(elements) {
      return Array.from(elements).sort((a, b) => {
        if (a === b) return 0;
        const pos = a.compareDocumentPosition(b);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
    },

    cleanPageTitle(rawTitle, platformPattern = '') {
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
  };

  // 1. ChatGPT Extractor (Preserved exactly as tested)
  const chatgptExtractor = {
    id: 'chatgpt',
    name: 'ChatGPT',
    hostnames: ['chatgpt.com', 'chat.openai.com'],
    matches(h) {
      return this.hostnames.some(d => h === d || h.endsWith('.' + d));
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
        'button', 'svg', '.sr-only', '[aria-hidden="true"]',
        '[data-testid*="action-button"]', '[data-testid*="copy-turn-action-button"]',
        '[aria-label="Copy"]', '[aria-label="Read aloud"]', '[aria-label="Good response"]',
        '[aria-label="Bad response"]', '[aria-label*="copy" i]', '[aria-label*="listen" i]',
        '[aria-label*="thumbs" i]', '[class*="agent-turn-actions"]', '#contextbridge-overlay-root'
      ]
    },
    resolveRole(el, fallbackIndex = 0) {
      if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
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
      if (el.querySelector) {
        if (el.querySelector('.markdown') || el.querySelector('[data-testid="agent-turn"]') || (el.classList && el.classList.contains('agent-turn'))) {
          return 'assistant';
        }
        if (el.querySelector('[class*="user-message"]') || el.querySelector('.whitespace-pre-wrap')) {
          return 'user';
        }
      }
      return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
    },
    extract() {
      console.log(`[ContextBridge] Starting ChatGPT conversation detection on: "${window.location.hostname}"`);
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
        const sortedRoleNodes = CommonExtractorUtils.sortElementsInDocumentOrder(roleNodes);
        const seenTexts = new Set();
        sortedRoleNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          const text = CommonExtractorUtils.extractCleanMessageText(node, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text) && !seenTexts.has(text)) {
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

      // Strategy 2: Evaluate turn containers
      if (extractedMessages.length === 0) {
        const turnSelector = 'article[data-testid^="conversation-turn-"], div[data-testid^="conversation-turn-"], [data-testid^="conversation-turn-"], main article';
        const rawTurnNodes = Array.from(document.querySelectorAll(turnSelector))
          .filter(el => !el.closest('#contextbridge-overlay-root'));

        if (rawTurnNodes.length > 0) {
          const dedupedTurns = rawTurnNodes.filter(el => !rawTurnNodes.some(other => other !== el && other.contains(el)));
          const sortedTurns = CommonExtractorUtils.sortElementsInDocumentOrder(dedupedTurns);
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

            const text = CommonExtractorUtils.extractCleanMessageText(contentNode, this.selectors.ignoreElements);
            if (CommonExtractorUtils.isMeaningfulContent(text) && !seenTexts.has(text)) {
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

      // Strategy 3: Main chat area fallback
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

          const dedupedBlocks = candidateBlocks.filter(el => !candidateBlocks.some(other => other !== el && other.contains(el)));
          const sortedBlocks = CommonExtractorUtils.sortElementsInDocumentOrder(dedupedBlocks);
          const seenTexts = new Set();

          sortedBlocks.forEach((block, idx) => {
            const role = this.resolveRole(block, idx);
            const text = CommonExtractorUtils.extractCleanMessageText(block, this.selectors.ignoreElements);
            if (CommonExtractorUtils.isMeaningfulContent(text) && !seenTexts.has(text)) {
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

      // Logging
      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
      } else {
        let failReason = 'No valid conversation elements found.';
        const totalElementsFound = Object.values(selectorCounts).reduce((a, b) => a + b, 0);
        if (totalElementsFound === 0) {
          failReason = 'None of the conversation turn selectors matched elements in the DOM.';
        } else {
          failReason = `${totalElementsFound} element(s) were matched by selectors, but none contained valid, meaningful text.`;
        }
        console.log(`[ContextBridge] Conversation extraction FAILED: ${failReason}`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'ChatGPT');
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

  // 2. Google Gemini Extractor
  const geminiExtractor = {
    id: 'gemini',
    name: 'Google Gemini',
    hostnames: ['gemini.google.com', 'bard.google.com'],
    matches(h) {
      return this.hostnames.some(d => h === d || h.endsWith('.' + d));
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
        'button', 'svg', '.sr-only', '[aria-hidden="true"]', 'mat-icon',
        '.mat-mdc-button', '[aria-label*="Listen" i]', '[aria-label*="Copy" i]',
        '[aria-label*="Share" i]', '[aria-label*="Modify" i]', '[aria-label*="Good response" i]',
        '[aria-label*="Bad response" i]', '#contextbridge-overlay-root'
      ]
    },
    resolveRole(el, fallbackIndex = 0) {
      if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
      const tag = (el.tagName || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();

      if (tag === 'user-query' || cls.includes('user-query') || (el.closest && el.closest('user-query'))) {
        return 'user';
      }
      if (tag === 'model-response' || cls.includes('model-response') || (el.closest && el.closest('model-response'))) {
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

      // Strategy 1: Angular Custom Elements (<user-query>, <model-response>)
      const customNodes = Array.from(
        document.querySelectorAll('user-query, model-response, .user-query-container, .model-response-container')
      ).filter(el => !el.closest('#contextbridge-overlay-root'));

      if (customNodes.length > 0) {
        const deduped = customNodes.filter(el => !customNodes.some(other => other !== el && other.contains(el)));
        const sortedNodes = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
        const seenTexts = new Set();

        sortedNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          let contentNode = node;
          if (role === 'user') {
            contentNode = node.querySelector('.query-text') || node.querySelector('user-query-content') || node;
          } else {
            contentNode = node.querySelector('.model-response-text') || node.querySelector('message-content') || node.querySelector('.markdown') || node;
          }

          const text = CommonExtractorUtils.extractCleanMessageText(contentNode, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text, ['Ask Gemini', 'Gemini may display inaccurate info']) && !seenTexts.has(text)) {
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

      // Strategy 2: Fallback to feed containers
      if (extractedMessages.length === 0) {
        const candidateTurns = Array.from(document.querySelectorAll('main [class*="query"], main [class*="response"], main message-content'))
          .filter(el => !el.closest('#contextbridge-overlay-root'))
          .filter(el => !el.closest('header, nav, aside, rich-textarea'));

        if (candidateTurns.length > 0) {
          const deduped = candidateTurns.filter(el => !candidateTurns.some(other => other !== el && other.contains(el)));
          const sortedTurns = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
          const seenTexts = new Set();

          sortedTurns.forEach((turn, idx) => {
            const role = this.resolveRole(turn, idx);
            const text = CommonExtractorUtils.extractCleanMessageText(turn, this.selectors.ignoreElements);
            if (CommonExtractorUtils.isMeaningfulContent(text) && !seenTexts.has(text)) {
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

      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
      } else {
        console.log(`[ContextBridge] Conversation extraction FAILED: No valid Gemini conversation elements found.`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'Gemini');
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

  // 3. Claude Extractor
  const claudeExtractor = {
    id: 'claude',
    name: 'Claude',
    hostnames: ['claude.ai'],
    matches(h) {
      return this.hostnames.some(d => h === d || h.endsWith('.' + d));
    },
    selectors: {
      candidateSelectors: [
        '[data-testid="user-message"], [data-testid="assistant-message"]',
        '.font-user-message, .font-claude-message',
        '[data-testid="chat-message-content"]',
        '[data-testid="conversation-turn"]',
        'div[data-is-streaming]'
      ],
      ignoreElements: [
        'button', 'svg', '.sr-only', '[aria-hidden="true"]',
        '[aria-label*="Copy" i]', '[aria-label*="Retry" i]',
        '[data-testid*="feedback"]', '[data-testid*="action"]',
        '[class*="artifact-panel"]', '#contextbridge-overlay-root'
      ]
    },
    resolveRole(el, fallbackIndex = 0) {
      if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();

      if (testId === 'user-message' || cls.includes('font-user-message') || (el.closest && el.closest('[data-testid="user-message"]'))) {
        return 'user';
      }
      if (testId === 'assistant-message' || cls.includes('font-claude-message') || cls.includes('font-claude') || (el.closest && el.closest('[data-testid="assistant-message"]'))) {
        return 'assistant';
      }
      if (testId.includes('user') || cls.includes('user')) return 'user';
      if (testId.includes('assistant') || cls.includes('claude') || cls.includes('assistant')) return 'assistant';
      return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
    },
    extract() {
      console.log(`[ContextBridge] Starting Claude conversation detection on: "${window.location.hostname}"`);
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
        const deduped = messageNodes.filter(el => !messageNodes.some(other => other !== el && other.contains(el)));
        const sortedNodes = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
        const seenTexts = new Set();

        sortedNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          const text = CommonExtractorUtils.extractCleanMessageText(node, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text, ['Claude is AI and can make mistakes']) && !seenTexts.has(text)) {
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

      // Strategy 2: Turn containers fallback
      if (extractedMessages.length === 0) {
        const turnNodes = Array.from(document.querySelectorAll('[data-testid="conversation-turn"], [data-testid="chat-message-content"], main .grid'))
          .filter(el => !el.closest('#contextbridge-overlay-root'))
          .filter(el => !el.closest('header, nav, aside, form'));

        if (turnNodes.length > 0) {
          const deduped = turnNodes.filter(el => !turnNodes.some(other => other !== el && other.contains(el)));
          const sortedTurns = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
          const seenTexts = new Set();

          sortedTurns.forEach((turn, idx) => {
            const role = this.resolveRole(turn, idx);
            const text = CommonExtractorUtils.extractCleanMessageText(turn, this.selectors.ignoreElements);
            if (CommonExtractorUtils.isMeaningfulContent(text) && !seenTexts.has(text)) {
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

      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns (${Math.ceil(extractedMessages.length / 2)} conversational exchanges).`);
      } else {
        console.log(`[ContextBridge] Conversation extraction FAILED: No valid Claude conversation elements found.`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'Claude');
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

  // 4. Perplexity Extractor
  const perplexityExtractor = {
    id: 'perplexity',
    name: 'Perplexity',
    hostnames: ['perplexity.ai'],
    matches(h) {
      return this.hostnames.some(d => h === d || h.endsWith('.' + d));
    },
    selectors: {
      candidateSelectors: [
        '[data-testid="user-query"], [id^="markdown-content-"]',
        'h1[class*="query"], div[class*="query"], div.prose',
        'main .font-display, main [class*="answer"]'
      ],
      ignoreElements: [
        'button', 'svg', '.sr-only', '[aria-hidden="true"]',
        '[class*="citation"]', '[class*="source"]', 'a[href^="http"]',
        '[data-testid*="follow-up"]', '[aria-label*="Copy" i]',
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
      const targetSelector = '[data-testid="user-query"], [id^="markdown-content-"], h1[class*="query"], h1.font-display, main div.prose, main div[class*="prose"]';
      const rawNodes = Array.from(document.querySelectorAll(targetSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'))
        .filter(el => !el.closest('header, nav, aside, form'));

      let extractedMessages = [];
      let extractionMethod = null;

      if (rawNodes.length > 0) {
        const deduped = rawNodes.filter(el => !rawNodes.some(other => other !== el && other.contains(el)));
        const sortedNodes = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
        const seenTexts = new Set();

        sortedNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          const text = CommonExtractorUtils.extractCleanMessageText(node, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text, ['Ask follow-up', 'Perplexity']) && !seenTexts.has(text)) {
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

      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns.`);
      } else {
        console.log(`[ContextBridge] Conversation extraction FAILED: No valid Perplexity conversation elements found.`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'Perplexity');
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

  // 5. Microsoft Copilot Extractor
  const copilotExtractor = {
    id: 'copilot',
    name: 'Microsoft Copilot',
    hostnames: ['copilot.microsoft.com', 'bing.com'],
    matches(h, p = '') {
      if (h === 'copilot.microsoft.com' || h.endsWith('.copilot.microsoft.com')) return true;
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
        'div[class*="message-container"]'
      ],
      ignoreElements: [
        'button', 'svg', '.sr-only', '[aria-hidden="true"]',
        '[class*="suggestion"]', '[class*="feedback"]', '#contextbridge-overlay-root'
      ]
    },
    resolveRole(el, fallbackIndex = 0) {
      if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
      const author = (el.getAttribute('data-author') || el.getAttribute('type') || '').toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();

      if (author === 'user' || testId.includes('user') || cls.includes('user')) return 'user';
      if (author === 'bot' || author === 'assistant' || testId.includes('bot') || testId.includes('copilot') || cls.includes('bot')) return 'assistant';
      return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
    },
    extract() {
      console.log(`[ContextBridge] Starting Microsoft Copilot conversation detection on: "${window.location.hostname}"`);
      const targetSelector = 'div[data-author="user"], div[data-author="bot"], [data-testid="user-message"], [data-testid="bot-message"], cib-chat-turn, div[class*="message-container"]';
      const messageNodes = Array.from(document.querySelectorAll(targetSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'))
        .filter(el => !el.closest('header, nav, aside'));

      let extractedMessages = [];
      let extractionMethod = null;

      if (messageNodes.length > 0) {
        const deduped = messageNodes.filter(el => !messageNodes.some(other => other !== el && other.contains(el)));
        const sortedNodes = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
        const seenTexts = new Set();

        sortedNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          const text = CommonExtractorUtils.extractCleanMessageText(node, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text, ['Copilot may make mistakes']) && !seenTexts.has(text)) {
            seenTexts.add(text);
            extractedMessages.push({
              id: `msg-${extractedMessages.length + 1}`,
              role: role,
              content: text
            });
          }
        });

        if (extractedMessages.length > 0) {
          extractionMethod = 'Copilot Message & Turn Elements';
        }
      }

      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns.`);
      } else {
        console.log(`[ContextBridge] Conversation extraction FAILED: No valid Copilot conversation elements found.`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'Copilot');
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

  // 6. Grok Extractor
  const grokExtractor = {
    id: 'grok',
    name: 'Grok',
    hostnames: ['grok.com', 'x.com', 'twitter.com'],
    matches(h, p = '') {
      if (h === 'grok.com' || h.endsWith('.grok.com')) return true;
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
        'main div.prose'
      ],
      ignoreElements: [
        'button', 'svg', '.sr-only', '[aria-hidden="true"]',
        '[data-testid*="sidebar"]', '[role="navigation"]', '[class*="thought"]',
        '[aria-label*="Thought for" i]', '#contextbridge-overlay-root'
      ]
    },
    resolveRole(el, fallbackIndex = 0) {
      if (!el) return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
      const cls = (el.className || '').toString().toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const roleAttr = (el.getAttribute('data-role') || '').toLowerCase();

      if (roleAttr === 'user' || cls.includes('user-message') || cls.includes('user') || testId.includes('user')) return 'user';
      if (roleAttr === 'assistant' || cls.includes('response') || cls.includes('prose') || testId.includes('grok')) return 'assistant';
      return fallbackIndex % 2 === 0 ? 'user' : 'assistant';
    },
    extract() {
      console.log(`[ContextBridge] Starting Grok conversation detection on: "${window.location.hostname}"`);
      const targetSelector = 'div[class*="message-bubble"], .response-content-markdown, div[class*="user-message"], [data-testid="grokMessage"], main div.prose';
      const messageNodes = Array.from(document.querySelectorAll(targetSelector))
        .filter(el => !el.closest('#contextbridge-overlay-root'))
        .filter(el => !el.closest('header, nav, aside, form, [data-testid*="sidebar"]'));

      let extractedMessages = [];
      let extractionMethod = null;

      if (messageNodes.length > 0) {
        const deduped = messageNodes.filter(el => !messageNodes.some(other => other !== el && other.contains(el)));
        const sortedNodes = CommonExtractorUtils.sortElementsInDocumentOrder(deduped);
        const seenTexts = new Set();

        sortedNodes.forEach((node, idx) => {
          const role = this.resolveRole(node, idx);
          const text = CommonExtractorUtils.extractCleanMessageText(node, this.selectors.ignoreElements);
          if (CommonExtractorUtils.isMeaningfulContent(text, ['Grok can make mistakes', 'Thought for']) && !seenTexts.has(text)) {
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

      if (extractedMessages.length > 0) {
        console.log(`[ContextBridge] Conversation extraction SUCCEEDED via ${extractionMethod}.`);
        console.log(`[ContextBridge] Extracted ${extractedMessages.length} valid conversation turns.`);
      } else {
        console.log(`[ContextBridge] Conversation extraction FAILED: No valid Grok conversation elements found.`);
      }

      const pageTitle = CommonExtractorUtils.cleanPageTitle(document.title, 'Grok');
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

  // Central Extractor Registry
  const ContextBridgeRegistry = {
    extractors: [
      chatgptExtractor,
      geminiExtractor,
      claudeExtractor,
      perplexityExtractor,
      copilotExtractor,
      grokExtractor
    ],

    register(extractor) {
      if (!extractor || !extractor.id) return;
      const idx = this.extractors.findIndex(e => e.id === extractor.id);
      if (idx >= 0) this.extractors[idx] = extractor;
      else this.extractors.push(extractor);
    },

    detectPlatform(hostname = window.location.hostname, pathname = window.location.pathname) {
      const h = (hostname || '').toLowerCase().trim();
      const p = (pathname || '').toLowerCase();
      return this.extractors.find(e => e.matches(h, p)) || null;
    },

    extractActiveConversation() {
      const hostname = window.location.hostname || '';
      const pathname = window.location.pathname || '';
      const activeExtractor = this.detectPlatform(hostname, pathname);

      if (!activeExtractor) {
        console.log(`[ContextBridge] Host "${hostname}" is not recognized as a supported AI platform.`);
        return {
          platform: 'unsupported',
          platformName: 'Unsupported Platform',
          detected: false,
          pageTitle: (document.title || '').trim() || 'Manual Context Session',
          url: window.location.href,
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: [],
          messageCount: 0,
          turnCount: 0,
          isPartial: false,
          sourceNotice: `ContextBridge is active on "${hostname}". This AI platform is not currently supported. Manual context mode enabled.`
        };
      }

      console.log(`[ContextBridge] Detected AI Platform: ${activeExtractor.name} (${activeExtractor.id}) on ${hostname}`);

      try {
        const rawResult = activeExtractor.extract();
        const normalized = (rawResult.messages || []).map((m, i) => ({
          id: m.id || `msg-${i + 1}`,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: (m.content || '').trim()
        })).filter(m => m.content.length > 0);

        return {
          platform: activeExtractor.id,
          platformName: activeExtractor.name,
          detected: normalized.length > 0,
          pageTitle: rawResult.pageTitle || (document.title || '').trim() || `${activeExtractor.name} Session`,
          url: window.location.href,
          capturedAt: rawResult.capturedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: normalized,
          messageCount: normalized.length,
          turnCount: Math.ceil(normalized.length / 2),
          isPartial: true,
          sourceNotice: rawResult.sourceNotice || `ContextBridge captured the conversation currently loaded on ${activeExtractor.name}.`
        };
      } catch (err) {
        console.error(`[ContextBridge] Extraction error on ${activeExtractor.name}:`, err);
        return {
          platform: activeExtractor.id,
          platformName: activeExtractor.name,
          detected: false,
          pageTitle: (document.title || '').trim() || `${activeExtractor.name} Session`,
          url: window.location.href,
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: [],
          messageCount: 0,
          turnCount: 0,
          isPartial: false,
          sourceNotice: `Error reading conversation from ${activeExtractor.name}. Manual context mode enabled.`
        };
      }
    }
  };

  // Extracted conversation state (stored separately from manual form state)
  let capturedConversation = null;
  let showManualReview = false;

  function detectAndReadActiveConversation(silent = false) {
    capturedConversation = ContextBridgeRegistry.extractActiveConversation();
    if (capturedConversation && capturedConversation.detected) {
      if (!state.projectName && capturedConversation.pageTitle) {
        state.projectName = capturedConversation.pageTitle;
      }
      if (!silent) {
        showToast(`${capturedConversation.platformName} detected • ${capturedConversation.messageCount} messages captured`);
      }
    } else {
      if (!silent) {
        const activeExt = ContextBridgeRegistry.detectPlatform();
        if (activeExt) {
          showToast(`No active ${activeExt.name} conversation detected`);
        } else {
          showToast('This AI platform is not currently supported');
        }
      }
    }
  }

  /**
   * Listen for messages from background.js (Extension toolbar click or hotkey)
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_CONTEXTBRIDGE_OVERLAY') {
      toggleOverlay();
      sendResponse({ status: 'ok', isVisible });
      return true;
    }
  });

  // Global keydown listener for Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isVisible) {
      hideOverlay();
    }
  });

  /**
   * Initialize or toggle the overlay
   */
  async function toggleOverlay() {
    if (!overlayHost) {
      await initializeOverlay();
    }

    if (isVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }

  function showOverlay() {
    if (!overlayHost) return;
    const backdrop = shadowRoot.querySelector('.cb-backdrop');
    if (backdrop) {
      backdrop.classList.add('cb-visible');
      isVisible = true;

      // Automatically detect and read ChatGPT conversation on the current page
      detectAndReadActiveConversation(true);
      if (currentView === 'capture') {
        renderActiveView();
      }

      // Focus primary task textarea if visible
      setTimeout(() => {
        const taskInput = shadowRoot.querySelector('#cb-task-input');
        if (taskInput) taskInput.focus();
      }, 150);
    }
  }

  function hideOverlay() {
    if (!overlayHost) return;
    const backdrop = shadowRoot.querySelector('.cb-backdrop');
    if (backdrop) {
      backdrop.classList.remove('cb-visible');
      isVisible = false;
    }
  }

  /**
   * Initialize Shadow DOM host and build the Stitch UI
   */
  async function initializeOverlay() {
    overlayHost = document.createElement('div');
    overlayHost.id = 'contextbridge-overlay-root';
    overlayHost.style.position = 'fixed';
    overlayHost.style.zIndex = '2147483647';
    overlayHost.style.top = '0';
    overlayHost.style.left = '0';
    document.body.appendChild(overlayHost);

    shadowRoot = overlayHost.attachShadow({ mode: 'open' });

    // Load saved preferences
    await loadInitialData();

    // Render template
    renderOverlayMarkup();

    // Attach listeners
    attachEventListeners();
  }

  /**
   * Load data from chrome.storage.local
   */
  async function loadInitialData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, THEME_KEY], (res) => {
        savedContexts = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
        if (res[THEME_KEY]) {
          currentTheme = res[THEME_KEY];
        }
        resolve();
      });
    });
  }

  /**
   * Render the full Stitch UI inside the Shadow DOM
   */
  function renderOverlayMarkup() {
    const cssUrl = chrome.runtime.getURL('overlay.css');
    const themeClass = currentTheme === 'light' ? 'cb-overlay-theme-light' : 'cb-overlay-theme-dark';

    shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${cssUrl}">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">

      <div class="cb-backdrop ${themeClass}">
        <div class="cb-ambient-aura"></div>
        
        <div class="cb-modal" id="cb-modal-container">
          <div class="cb-specular-edge"></div>

          <!-- TOP HEADER -->
          <header class="cb-header">
            <div class="cb-brand-lockup">
              <!-- Freestanding Mobius Ribbon Logo -->
              <svg width="44" height="26" viewBox="0 0 52 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
                <defs>
                  <linearGradient id="cbMobiusGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#4f46e5" />
                    <stop offset="45%" stop-color="#6366f1" />
                    <stop offset="100%" stop-color="#a855f7" />
                  </linearGradient>
                  <linearGradient id="cbMobiusGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="50%" stop-color="#60a5fa" />
                    <stop offset="100%" stop-color="#c084fc" />
                  </linearGradient>
                </defs>
                <path
                  d="M 14 6 C 7 6, 3 10, 3 15 C 3 20, 7 24, 14 24 C 20.5 24, 23.5 18.5, 26 15 C 28.5 11.5, 31.5 6, 38 6 C 45 6, 49 10, 49 15 C 49 20, 45 24, 38 24 C 31.5 24, 28.5 18.5, 26 15 C 23.5 11.5, 20.5 6, 14 6 Z"
                  stroke="${currentTheme === 'light' ? 'url(#cbMobiusGradLight)' : 'url(#cbMobiusGradDark)'}"
                  stroke-width="4.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="cb-brand-title-wrap">
                <div class="cb-brand-row">
                  <span class="cb-brand-name">ContextBridge</span>
                </div>
                <span class="cb-brand-tagline">Move your work, not just your chat.</span>
              </div>
            </div>

            <!-- CONTROLS & THEME TOGGLE -->
            <div class="cb-header-controls">
              <!-- Live Hook Pill -->
              <div class="cb-live-hook-pill" title="Connected to active tab">
                <span class="cb-pulse-dot"></span>
                <span>Hook: ${escapeHtml(activeTabName)}</span>
              </div>

              <!-- Theme Switcher Pill -->
              <div class="cb-theme-switcher" role="radiogroup" aria-label="Theme">
                <button type="button" class="cb-theme-btn ${currentTheme === 'dark' ? 'cb-active' : ''}" id="cb-theme-dark-btn">
                  Fluid Glass
                </button>
                <button type="button" class="cb-theme-btn ${currentTheme === 'light' ? 'cb-active' : ''}" id="cb-theme-light-btn">
                  Glass Flow
                </button>
              </div>

              <!-- Saved Contexts Toggle -->
              <button type="button" class="cb-icon-btn" id="cb-toggle-saved-btn" title="View Saved Contexts (${savedContexts.length})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </button>

              <!-- Close Button -->
              <button type="button" class="cb-close-btn" id="cb-close-btn" title="Dismiss (Esc)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span class="cb-kbd-esc">Esc</span>
              </button>
            </div>
          </header>

          <!-- BODY VIEW CONTAINER -->
          <div class="cb-body" id="cb-body-content">
            <!-- Dynamic view injected via renderActiveView() -->
          </div>

          <!-- FOOTER ACTION BAR -->
          <footer class="cb-footer">
            <div class="cb-meta-strip">
              <div class="cb-active-tab-indicator">
                <span class="cb-pulse-dot"></span>
                <span>Active: <strong style="color: var(--cb-accent-primary);">${escapeHtml(activeTabName)}</strong></span>
              </div>
              <span>•</span>
              <span id="cb-token-est">~1,420 tokens</span>
              <span>•</span>
              <span style="color: #10b981;">🔒 Local Storage Only</span>
            </div>

            <div class="cb-action-group">
              <select class="cb-format-select" id="cb-format-selector" title="Context Packaging Format">
                <option value="standard">Standard AI Prompt</option>
                <option value="markdown">Clean Markdown</option>
                <option value="xml">XML Tags (Claude/Gemini)</option>
                <option value="compact">Compact 1-Line</option>
              </select>

              <button type="button" class="cb-btn-secondary" id="cb-preset-btn">
                Presets ▾
              </button>

              <button type="button" class="cb-cta-primary" id="cb-generate-cta">
                <span>Generate Context</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </footer>

          <!-- FLOATING TOAST -->
          <div class="cb-toast" id="cb-toast">Package copied to clipboard!</div>
        </div>
      </div>
    `;

    renderActiveView();
  }

  /**
   * Render the view based on current state (Capture / Preview / Saved)
   */
  function renderActiveView() {
    const container = shadowRoot.querySelector('#cb-body-content');
    if (!container) return;

    if (currentView === 'preview') {
      renderPreviewView(container);
    } else if (currentView === 'saved') {
      renderSavedView(container);
    } else {
      renderCaptureView(container);
    }

    updateStats();
  }

  /**
   * 1. Primary Capture View (Stitch UI 2-Column Split)
   */
  function renderCaptureView(container) {
    const hasCaptured = capturedConversation && capturedConversation.detected && capturedConversation.messages.length > 0;
    const activePlatform = ContextBridgeRegistry.detectPlatform();
    const isPlatformSupported = !!activePlatform;
    const detectedPlatformName = capturedConversation?.platformName || activePlatform?.name || 'AI';

    let leftColumnHtml = '';

    if (hasCaptured) {
      // Stream of captured conversation messages
      const messagesHtml = capturedConversation.messages.map((msg) => {
        const isUser = msg.role === 'user';
        const roleClass = isUser ? 'cb-role-tag-user' : 'cb-role-tag-assistant';
        const roleLabel = isUser ? 'USER' : (capturedConversation.platformName ? capturedConversation.platformName.toUpperCase() : 'AI');
        return `
          <div class="cb-chat-msg-row">
            <div class="cb-msg-header">
              <span class="cb-role-tag ${roleClass}">${escapeHtml(roleLabel)}</span>
            </div>
            <div class="cb-msg-content-preview">${escapeHtml(msg.content)}</div>
          </div>
        `;
      }).join('');

      leftColumnHtml = `
        <div class="cb-capture-column">
          <!-- Connection Status Bar with Refresh -->
          <div class="cb-capture-status-bar">
            <div class="cb-status-left">
              <span class="cb-pulse-dot"></span>
              <span class="cb-status-title">${escapeHtml(detectedPlatformName)} conversation detected</span>
              <span class="cb-status-counter">${capturedConversation.messageCount} messages (${capturedConversation.turnCount} turns)</span>
            </div>
            <button type="button" class="cb-refresh-btn" id="cb-refresh-chat-btn" title="Re-read currently loaded messages from the webpage">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>Refresh Conversation</span>
            </button>
          </div>

          <!-- Honest Long Conversation Disclaimer -->
          <div class="cb-honesty-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>${escapeHtml(capturedConversation.sourceNotice || `ContextBridge captured the conversation currently loaded on ${detectedPlatformName}.`)}</span>
          </div>

          <!-- Captured Conversation Stream Card -->
          <div class="cb-chat-stream-card">
            <div class="cb-chat-stream-header">
              <span>Captured Chat: <strong>${escapeHtml(capturedConversation.pageTitle || 'Active Session')}</strong></span>
              <span style="font-size: 0.65rem; color: var(--cb-text-muted); font-family: 'JetBrains Mono', monospace;">
                Read at ${capturedConversation.capturedAt}
              </span>
            </div>
            <div class="cb-chat-messages-scroll">
              ${messagesHtml}
            </div>
          </div>

          <!-- Optional Review / Supplement Toggle -->
          <div style="padding-top: 0.25rem;">
            <button type="button" class="cb-supplement-toggle-btn" id="cb-toggle-supplement-btn">
              <span>${showManualReview ? '▲ Hide supplemental notes' : '▼ Optional: Review or supplement context (task, constraints, next steps)'}</span>
            </button>
          </div>

          ${showManualReview ? `
            <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.25rem;">
              <div class="cb-project-bar">
                <span class="cb-project-label">Topic / Title:</span>
                <input 
                  type="text" 
                  class="cb-project-input" 
                  id="cb-project-input" 
                  placeholder="e.g. FastAPI Redis Pipeline" 
                  value="${escapeHtml(state.projectName)}"
                />
              </div>

              <div class="cb-card">
                <div class="cb-card-header">
                  <div class="cb-card-title-group">
                    <label class="cb-card-label" for="cb-next-input">Next Steps / Instructions for Next AI:</label>
                  </div>
                </div>
                <textarea 
                  class="cb-card-textarea" 
                  id="cb-next-input" 
                  rows="2" 
                  placeholder="Override or specify exact instructions for the receiving AI..."
                >${escapeHtml(state.nextSteps)}</textarea>
              </div>

              <div class="cb-card">
                <div class="cb-card-header">
                  <div class="cb-card-title-group">
                    <label class="cb-card-label" for="cb-context-input">Supplemental Technical Constraints:</label>
                  </div>
                </div>
                <textarea 
                  class="cb-card-textarea" 
                  id="cb-context-input" 
                  rows="2" 
                  placeholder="Runtime libraries, framework version, non-functional requirements..."
                >${escapeHtml(state.importantContext)}</textarea>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Manual fallback view (unsupported website or no messages found)
      const statusTitle = isPlatformSupported ? 'Manual Context Mode' : 'Unsupported AI Platform';
      const statusSubtitle = isPlatformSupported
        ? `No active ${escapeHtml(activePlatform.name)} conversation detected on this page`
        : `This AI platform is not currently supported (${escapeHtml(window.location.hostname || 'unknown domain')})`;

      leftColumnHtml = `
        <div class="cb-capture-column">
          <!-- Status Banner: Manual Mode -->
          <div class="cb-capture-status-bar">
            <div class="cb-status-left">
              <span class="cb-status-dot-gray"></span>
              <span class="cb-status-title">${escapeHtml(statusTitle)}</span>
              <span class="cb-status-subtitle">${escapeHtml(statusSubtitle)}</span>
            </div>
            <button type="button" class="cb-refresh-btn" id="cb-refresh-chat-btn" title="Scan webpage again for conversation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>Scan Page</span>
            </button>
          </div>

          ${!isPlatformSupported ? `
            <div class="cb-honesty-note" style="border-color: rgba(239, 68, 68, 0.25); background: rgba(239, 68, 68, 0.05); margin-bottom: 0.75rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span style="color: var(--cb-text-secondary); font-size: 0.7rem;">
                Supported platforms: <strong>ChatGPT, Google Gemini, Claude, Perplexity, Microsoft Copilot, and Grok</strong>. You can manually enter context below.
              </span>
            </div>
          ` : ''}

          <!-- Project Name Input Bar -->
          <div class="cb-project-bar">
            <span class="cb-project-label">Project:</span>
            <input 
              type="text" 
              class="cb-project-input" 
              id="cb-project-input" 
              placeholder="e.g. Next.js WebSocket Pipeline" 
              value="${escapeHtml(state.projectName)}"
            />
          </div>

          <!-- Card 1: What are you working on? (Current Task) -->
          <div class="cb-card">
            <div class="cb-card-active-glow"></div>
            <div class="cb-card-header">
              <div class="cb-card-title-group">
                <div class="cb-card-icon cb-card-icon-task">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                  </svg>
                </div>
                <label class="cb-card-label" for="cb-task-input">What are you working on?</label>
              </div>
              <span class="cb-card-badge cb-badge-primary">CURRENT TASK</span>
            </div>
            <textarea 
              class="cb-card-textarea" 
              id="cb-task-input" 
              rows="2" 
              placeholder="Describe what you are actively solving or implementing..."
            >${escapeHtml(state.currentTask)}</textarea>
            <div class="cb-card-footer">
              <div class="cb-tag-row">
                <span class="cb-micro-tag">Active Focus</span>
                <span class="cb-micro-tag">Manual Entry</span>
              </div>
              <span>Keep concise</span>
            </div>
          </div>

          <!-- Card 2: What's been completed? (Work Completed) -->
          <div class="cb-card">
            <div class="cb-card-header">
              <div class="cb-card-title-group">
                <div class="cb-card-icon cb-card-icon-completed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <label class="cb-card-label" for="cb-completed-input">What's been completed?</label>
              </div>
              <span class="cb-card-badge cb-badge-secondary">VERIFIED</span>
            </div>
            <textarea 
              class="cb-card-textarea" 
              id="cb-completed-input" 
              rows="2" 
              placeholder="What code, routes, or tests are already finished?"
            >${escapeHtml(state.workCompleted)}</textarea>
            <div class="cb-card-footer">
              <div class="cb-tag-row">
                <span class="cb-micro-tag">Ready for Next AI</span>
              </div>
            </div>
          </div>

          <!-- Card 3: What's next? (Next Steps) -->
          <div class="cb-card">
            <div class="cb-card-header">
              <div class="cb-card-title-group">
                <div class="cb-card-icon cb-card-icon-next">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
                <label class="cb-card-label" for="cb-next-input">What's next?</label>
              </div>
              <span class="cb-card-badge cb-badge-ready">READY TO DISPATCH</span>
            </div>
            <textarea 
              class="cb-card-textarea" 
              id="cb-next-input" 
              rows="2" 
              placeholder="Exact bullet points for the next AI assistant..."
            >${escapeHtml(state.nextSteps)}</textarea>
            <div class="cb-card-footer">
              <div class="cb-tag-row">
                <span class="cb-micro-tag">Target: Claude / Gemini / Cursor</span>
              </div>
            </div>
          </div>

          <!-- Card 4 (Expandable): Important Context & Constraints -->
          <div class="cb-card">
            <div class="cb-card-header">
              <div class="cb-card-title-group">
                <div class="cb-card-icon cb-card-icon-context">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <label class="cb-card-label" for="cb-context-input">Important Context &amp; Architecture</label>
              </div>
              <span class="cb-card-badge cb-badge-ready">CONSTRAINTS</span>
            </div>
            <textarea 
              class="cb-card-textarea" 
              id="cb-context-input" 
              rows="2" 
              placeholder="Key constraints, runtime dependencies, libraries, architectural rules..."
            >${escapeHtml(state.importantContext)}</textarea>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="cb-grid-split">
        <!-- Left: Dynamic Capture Column (Auto ChatGPT Stream OR Manual Cards) -->
        ${leftColumnHtml}

        <!-- Right: Concentric Arches Bridge Tile + Radiant CTA (Stitch Reference) -->
        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div class="cb-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex: 1; padding: 1.5rem 1rem;">
            <svg width="100" height="65" viewBox="0 0 100 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0.5rem 0;">
              <defs>
                <linearGradient id="cbArchOuterLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#93c5fd" />
                  <stop offset="100%" stop-color="#a5b4fc" />
                </linearGradient>
                <linearGradient id="cbArchInnerLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4f46e5" />
                  <stop offset="100%" stop-color="#7c3aed" />
                </linearGradient>
                <linearGradient id="cbArchOuterDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="100%" stop-color="#818cf8" />
                </linearGradient>
                <linearGradient id="cbArchInnerDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#60a5fa" />
                  <stop offset="100%" stop-color="#c084fc" />
                </linearGradient>
              </defs>
              <!-- Outer Arch -->
              <path
                d="M 18 52 L 24 52 A 26 26 0 0 1 76 52 L 82 52"
                stroke="${currentTheme === 'light' ? 'url(#cbArchOuterLight)' : 'url(#cbArchOuterDark)'}"
                stroke-width="3.5"
                stroke-linecap="round"
              />
              <!-- Inner Arch -->
              <path
                d="M 30 52 L 34 52 A 16 16 0 0 1 66 52 L 70 52"
                stroke="${currentTheme === 'light' ? 'url(#cbArchInnerLight)' : 'url(#cbArchInnerDark)'}"
                stroke-width="4"
                stroke-linecap="round"
              />
            </svg>
            <div style="margin-top: 0.5rem; text-align: center;">
              <p style="font-size: 0.75rem; font-weight: 500; line-height: 1.4; color: var(--cb-text-primary);">
                Your context,
              </p>
              <p style="font-size: 0.75rem; font-weight: 500; line-height: 1.4; color: var(--cb-text-primary);">
                across every AI.
              </p>
              <p style="font-size: 0.65rem; color: var(--cb-text-muted); margin-top: 0.35rem; font-family: 'JetBrains Mono', monospace;">
                ${hasCaptured ? `Ready to Transfer • ${capturedConversation.messageCount} msgs` : 'Zero-loss Context Hand-off'}
              </p>
            </div>
          </div>

          <!-- Radiant Generate Context Button Matching Reference Design -->
          <button type="button" class="cb-cta-primary" id="cb-generate-card-cta" style="width: 100%; justify-content: center; padding: 0.65rem 1.25rem;">
            <span>Generate Context</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Re-bind input listeners
    bindInput('cb-project-input', 'projectName');
    bindInput('cb-task-input', 'currentTask');
    bindInput('cb-completed-input', 'workCompleted');
    bindInput('cb-next-input', 'nextSteps');
    bindInput('cb-context-input', 'importantContext');

    const refreshBtn = shadowRoot.querySelector('#cb-refresh-chat-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        detectAndReadActiveConversation(false);
        renderActiveView();
      });
    }

    const toggleSupplementBtn = shadowRoot.querySelector('#cb-toggle-supplement-btn');
    if (toggleSupplementBtn) {
      toggleSupplementBtn.addEventListener('click', () => {
        showManualReview = !showManualReview;
        renderActiveView();
      });
    }

    const cardCta = shadowRoot.querySelector('#cb-generate-card-cta');
    if (cardCta) {
      cardCta.addEventListener('click', () => {
        currentView = 'preview';
        renderActiveView();
      });
    }
  }

  /**
   * 2. Generated Context Package Preview View
   */
  function renderPreviewView(container) {
    const formatted = generateFormattedPackage();
    const stats = calculateStats(formatted);

    container.innerHTML = `
      <div class="cb-preview-panel">
        <div class="cb-preview-header">
          <div>
            <span class="cb-preview-title">Generated Context Package</span>
            <span style="font-family: monospace; font-size: 0.72rem; color: var(--cb-text-muted); margin-left: 0.5rem;">
              ${stats.words} words · ~${stats.tokens} tokens
            </span>
          </div>

          <button type="button" class="cb-btn-secondary" id="cb-back-to-edit-btn">
            ← Edit Context
          </button>
        </div>

        <pre class="cb-preview-box" id="cb-preview-pre">${escapeHtml(formatted)}</pre>

        <div class="cb-preview-actions">
          <div class="cb-destination-row">
            <span style="font-size: 0.72rem; color: var(--cb-text-muted);">Quick Transfer:</span>
            <button type="button" class="cb-micro-tag" id="cb-send-claude" style="cursor: pointer;">Claude</button>
            <button type="button" class="cb-micro-tag" id="cb-send-chatgpt" style="cursor: pointer;">ChatGPT</button>
            <button type="button" class="cb-micro-tag" id="cb-send-gemini" style="cursor: pointer;">Gemini</button>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="cb-btn-secondary" id="cb-save-local-btn">
              Save Locally
            </button>
            <button type="button" class="cb-cta-primary" id="cb-copy-pkg-btn">
              <span>Copy Package</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    shadowRoot.querySelector('#cb-back-to-edit-btn').addEventListener('click', () => {
      currentView = 'capture';
      renderActiveView();
    });

    shadowRoot.querySelector('#cb-copy-pkg-btn').addEventListener('click', () => {
      copyToClipboard(formatted);
    });

    shadowRoot.querySelector('#cb-save-local-btn').addEventListener('click', async () => {
      await saveCurrentContextLocally();
      showToast('Saved to local storage!');
    });

    shadowRoot.querySelector('#cb-send-claude').addEventListener('click', () => {
      copyToClipboard(formatted);
      window.open('https://claude.ai/new', '_blank');
    });

    shadowRoot.querySelector('#cb-send-chatgpt').addEventListener('click', () => {
      copyToClipboard(formatted);
      window.open('https://chatgpt.com', '_blank');
    });

    shadowRoot.querySelector('#cb-send-gemini').addEventListener('click', () => {
      copyToClipboard(formatted);
      window.open('https://gemini.google.com/app', '_blank');
    });
  }

  /**
   * 3. Saved Contexts List View
   */
  function renderSavedView(container) {
    container.innerHTML = `
      <div class="cb-saved-drawer">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="cb-preview-title">Saved Contexts (${savedContexts.length})</span>
          <button type="button" class="cb-btn-secondary" id="cb-back-from-saved-btn">
            ← Return to Editor
          </button>
        </div>

        <input 
          type="search" 
          class="cb-search-input" 
          id="cb-saved-search" 
          placeholder="Filter saved projects by name or task..."
        />

        <div class="cb-saved-list" id="cb-saved-items-container">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    shadowRoot.querySelector('#cb-back-from-saved-btn').addEventListener('click', () => {
      currentView = 'capture';
      renderActiveView();
    });

    const searchInput = shadowRoot.querySelector('#cb-saved-search');
    searchInput.addEventListener('input', () => {
      renderSavedCards(searchInput.value);
    });

    renderSavedCards();
  }

  function renderSavedCards(query = '') {
    const listContainer = shadowRoot.querySelector('#cb-saved-items-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const q = query.toLowerCase().trim();

    const filtered = savedContexts.filter(item => {
      if (!q) return true;
      return (
        (item.projectName && item.projectName.toLowerCase().includes(q)) ||
        (item.currentTask && item.currentTask.toLowerCase().includes(q)) ||
        (item.importantContext && item.importantContext.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--cb-text-muted); font-size: 0.78rem;">
          ${savedContexts.length === 0 ? 'No saved contexts yet. Create one in the editor!' : 'No matching contexts found.'}
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'cb-saved-item';
      const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      card.innerHTML = `
        <div class="cb-saved-item-header">
          <span class="cb-saved-title">${escapeHtml(item.projectName || 'Untitled Project')}</span>
          <span class="cb-saved-date">${dateStr}</span>
        </div>
        <p class="cb-saved-task">${escapeHtml(item.currentTask || 'No task specified')}</p>
        <div class="cb-saved-actions">
          <button type="button" class="cb-micro-tag btn-load-item" style="cursor: pointer;">Load &amp; Edit</button>
          <button type="button" class="cb-micro-tag btn-copy-item" style="cursor: pointer;">Copy Context</button>
          <button type="button" class="cb-micro-tag btn-delete-item" style="color: #ef4444; margin-left: auto; cursor: pointer;">Delete</button>
        </div>
      `;

      card.querySelector('.btn-load-item').addEventListener('click', () => {
        state.projectName = item.projectName || '';
        state.currentTask = item.currentTask || '';
        state.workCompleted = item.workCompleted || '';
        state.nextSteps = item.nextSteps || '';
        state.importantContext = item.importantContext || '';
        currentEditingId = item.id;
        currentView = 'capture';
        renderActiveView();
        showToast(`Loaded "${item.projectName}"`);
      });

      card.querySelector('.btn-copy-item').addEventListener('click', () => {
        const text = formatData(item, state.format);
        copyToClipboard(text);
      });

      card.querySelector('.btn-delete-item').addEventListener('click', async () => {
        savedContexts = savedContexts.filter(c => c.id !== item.id);
        if (currentEditingId === item.id) currentEditingId = null;
        await chrome.storage.local.set({ [STORAGE_KEY]: savedContexts });
        renderSavedCards(query);
        showToast('Context deleted');
      });

      listContainer.appendChild(card);
    });
  }

  /**
   * Helper to bind input values into internal state
   */
  function bindInput(id, stateKey) {
    const el = shadowRoot.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('input', () => {
      state[stateKey] = el.value;
      updateStats();
    });
  }

  /**
   * Attach global event listeners in Shadow DOM
   */
  function attachEventListeners() {
    // Backdrop click outside to close
    const backdrop = shadowRoot.querySelector('.cb-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        hideOverlay();
      }
    });

    // Close button
    const closeBtn = shadowRoot.querySelector('#cb-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideOverlay);
    }

    // Theme Switcher Buttons
    const darkBtn = shadowRoot.querySelector('#cb-theme-dark-btn');
    const lightBtn = shadowRoot.querySelector('#cb-theme-light-btn');

    darkBtn.addEventListener('click', () => setTheme('dark'));
    lightBtn.addEventListener('click', () => setTheme('light'));

    // Toggle Saved Contexts view
    const savedBtn = shadowRoot.querySelector('#cb-toggle-saved-btn');
    savedBtn.addEventListener('click', () => {
      currentView = currentView === 'saved' ? 'capture' : 'saved';
      renderActiveView();
    });

    // Format Selector
    const formatSel = shadowRoot.querySelector('#cb-format-selector');
    formatSel.addEventListener('change', () => {
      state.format = formatSel.value;
      if (currentView === 'preview') {
        renderActiveView();
      }
    });

    // Presets Button
    const presetBtn = shadowRoot.querySelector('#cb-preset-btn');
    presetBtn.addEventListener('click', () => {
      applyQuickPreset();
    });

    // Generate Context CTA
    const generateBtn = shadowRoot.querySelector('#cb-generate-cta');
    generateBtn.addEventListener('click', () => {
      currentView = 'preview';
      renderActiveView();
    });
  }

  /**
   * Toggle between Fluid Glass (Dark) and Glass Flow (Light)
   */
  function setTheme(theme) {
    currentTheme = theme;
    const backdrop = shadowRoot.querySelector('.cb-backdrop');
    if (theme === 'light') {
      backdrop.classList.remove('cb-overlay-theme-dark');
      backdrop.classList.add('cb-overlay-theme-light');
      shadowRoot.querySelector('#cb-theme-light-btn').classList.add('cb-active');
      shadowRoot.querySelector('#cb-theme-dark-btn').classList.remove('cb-active');
    } else {
      backdrop.classList.remove('cb-overlay-theme-light');
      backdrop.classList.add('cb-overlay-theme-dark');
      shadowRoot.querySelector('#cb-theme-dark-btn').classList.add('cb-active');
      shadowRoot.querySelector('#cb-theme-light-btn').classList.remove('cb-active');
    }

    chrome.storage.local.set({ [THEME_KEY]: theme });
  }

  /**
   * Quick fill a sample preset to test cross-AI handoff
   */
  function applyQuickPreset() {
    state.projectName = 'Token-Bucket Rate Limiter in Rust';
    state.currentTask = 'Refactoring atomic zero-copy token-bucket rate limiter and WebSocket session router';
    state.workCompleted = 'Implemented lock-free atomic capacity replenishment, concurrency guards, and verified 24 tests passing';
    state.nextSteps = 'Benchmark under 50k conn/s load, add shutdown hooks, and transfer session schema to Gemini';
    state.importantContext = 'Rust 2024 edition, Tokio MPSC channels, lock-free atomics, zero-copy byte buffers. Avoid mutex contention.';

    currentEditingId = null;
    currentView = 'capture';
    renderActiveView();
    showToast('Loaded active Rust template!');
  }

  /**
   * Generate the standardized ContextBridge package
   */
  function generateFormattedPackage() {
    return formatData(state, state.format);
  }

  function formatData(data, format = 'standard') {
    // Primary source: If an automatically captured conversation exists, format it directly!
    if (capturedConversation && capturedConversation.detected && capturedConversation.messages.length > 0) {
      const platformName = capturedConversation.platformName || (capturedConversation.platform === 'gemini' ? 'Google Gemini' : capturedConversation.platform === 'claude' ? 'Claude' : capturedConversation.platform === 'perplexity' ? 'Perplexity' : capturedConversation.platform === 'copilot' ? 'Microsoft Copilot' : capturedConversation.platform === 'grok' ? 'Grok' : 'ChatGPT');
      const title = (data.projectName || capturedConversation.pageTitle || `${platformName} Conversation Session`).trim();
      const notice = capturedConversation.sourceNotice || `ContextBridge captured the conversation currently loaded on ${platformName}.`;
      const msgCount = capturedConversation.messages.length;

      const hasManualSupplements = (data.currentTask && data.currentTask.trim()) ||
        (data.workCompleted && data.workCompleted.trim()) ||
        (data.nextSteps && data.nextSteps.trim()) ||
        (data.importantContext && data.importantContext.trim());

      switch (format) {
        case 'markdown': {
          const turnsMd = capturedConversation.messages.map((m) => {
            const roleLabel = m.role === 'user' ? 'User' : `Assistant (${platformName})`;
            return `### ${roleLabel}\n${m.content.trim()}`;
          }).join('\n\n');

          let suppMd = '';
          if (hasManualSupplements) {
            suppMd = `\n\n## Review & Working Constraints\n` +
              (data.currentTask ? `**Current Task:** ${data.currentTask}\n\n` : '') +
              (data.importantContext ? `**Context:** ${data.importantContext}\n\n` : '') +
              (data.workCompleted ? `**Completed:** ${data.workCompleted}\n\n` : '') +
              (data.nextSteps ? `**Next Steps:** ${data.nextSteps}\n\n` : '');
          }

          return `# ContextBridge: ${title}
*Source: ${platformName} • ${msgCount} messages captured*

> **Notice:** ${notice}

## Conversation Transcript
${turnsMd}${suppMd}`;
        }

        case 'xml': {
          const turnsXml = capturedConversation.messages.map((m) =>
            `    <message role="${m.role}">${escapeXml(m.content.trim())}</message>`
          ).join('\n');

          let suppXml = '';
          if (hasManualSupplements) {
            suppXml = `\n  <supplements>\n` +
              (data.currentTask ? `    <current_task>${escapeXml(data.currentTask)}</current_task>\n` : '') +
              (data.importantContext ? `    <important_context>${escapeXml(data.importantContext)}</important_context>\n` : '') +
              (data.workCompleted ? `    <work_completed>${escapeXml(data.workCompleted)}</work_completed>\n` : '') +
              (data.nextSteps ? `    <next_steps>${escapeXml(data.nextSteps)}</next_steps>\n` : '') +
              `  </supplements>`;
          }

          return `<context_bridge source="${capturedConversation.platform}" platform="${escapeXml(platformName)}" messages="${msgCount}">
  <meta>
    <project>${escapeXml(title)}</project>
    <notice>${escapeXml(notice)}</notice>
    <captured_at>${escapeXml(capturedConversation.capturedAt)}</captured_at>
  </meta>
  <conversation>
${turnsXml}
  </conversation>${suppXml}
</context_bridge>`;
        }

        case 'compact': {
          const snippet = capturedConversation.messages
            .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/\s+/g, ' ').slice(0, 120)}...`)
            .join(' | ');
          const nextPart = data.nextSteps ? ` | NEXT: ${data.nextSteps.replace(/\s+/g, ' ')}` : '';
          return `[CONTEXTBRIDGE: ${platformName.toUpperCase()} (${msgCount} msgs)] ${title} | NOTICE: ${notice} | ${snippet}${nextPart}`;
        }

        case 'standard':
        default: {
          const metaHeader = `[SYSTEM CONTEXT: The user is transferring their active working context from ${platformName}. Review the captured conversation transcript below and continue the task directly without asking the user to re-explain.]\n\n`;

          const transcript = capturedConversation.messages.map((m) => {
            const roleLabel = m.role === 'user' ? '[USER]' : `[ASSISTANT (${platformName.toUpperCase()})]`;
            return `${roleLabel}:\n${m.content.trim()}`;
          }).join('\n\n');

          let suppText = '';
          if (hasManualSupplements) {
            suppText = `\n\n----------------------------------------\nSUPPLEMENTAL NOTES & NEXT STEPS:\n` +
              (data.currentTask ? `TASK: ${data.currentTask}\n` : '') +
              (data.importantContext ? `CONTEXT: ${data.importantContext}\n` : '') +
              (data.workCompleted ? `COMPLETED: ${data.workCompleted}\n` : '') +
              (data.nextSteps ? `NEXT STEPS: ${data.nextSteps}\n` : '');
          }

          return `${metaHeader}PROJECT: ${title}
SOURCE: ${platformName} (Auto-Captured)
MESSAGES CAPTURED: ${msgCount}
STATUS: ${notice}

CONVERSATION TRANSCRIPT:
----------------------------------------\n${transcript}${suppText}`;
        }
      }
    }

    // Fallback: Manual context fields
    const name = data.projectName || 'Untitled Project';
    const task = data.currentTask || 'None specified';
    const context = data.importantContext || 'None specified';
    const completed = data.workCompleted || 'None specified';
    const next = data.nextSteps || 'None specified';

    switch (format) {
      case 'markdown':
        return `# ContextBridge: ${name}

## Current Task
${task}

## Important Context
${context}

## Work Completed
${completed}

## Next Steps
${next}`;

      case 'xml':
        return `<context_bridge>
  <project>${escapeXml(name)}</project>
  <current_task>${escapeXml(task)}</current_task>
  <important_context>${escapeXml(context)}</important_context>
  <work_completed>${escapeXml(completed)}</work_completed>
  <next_steps>${escapeXml(next)}</next_steps>
</context_bridge>`;

      case 'compact':
        return `PROJECT: ${name} | TASK: ${task} | CONTEXT: ${context} | COMPLETED: ${completed} | NEXT: ${next}`;

      case 'standard':
      default:
        return `PROJECT: ${name}

CURRENT TASK:
${task}

IMPORTANT CONTEXT:
${context}

WORK COMPLETED:
${completed}

NEXT STEPS:
${next}`;
    }
  }

  async function saveCurrentContextLocally() {
    const now = new Date().toISOString();
    const itemData = {
      projectName: state.projectName || 'Untitled Project',
      currentTask: state.currentTask || '',
      importantContext: state.importantContext || '',
      workCompleted: state.workCompleted || '',
      nextSteps: state.nextSteps || '',
      updatedAt: now
    };

    if (currentEditingId) {
      const idx = savedContexts.findIndex(c => c.id === currentEditingId);
      if (idx !== -1) {
        savedContexts[idx] = { ...savedContexts[idx], ...itemData };
      }
    } else {
      const newItem = {
        id: 'ctx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...itemData,
        createdAt: now
      };
      currentEditingId = newItem.id;
      savedContexts.unshift(newItem);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: savedContexts });
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Context package copied to clipboard!');
    } catch {
      // Fallback using textarea inside shadow
      const ta = document.createElement('textarea');
      ta.value = text;
      shadowRoot.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      shadowRoot.removeChild(ta);
      showToast('Context package copied to clipboard!');
    }
  }

  function updateStats() {
    const text = generateFormattedPackage();
    const chars = text.length;
    const tokens = Math.ceil(chars / 4);
    const estEl = shadowRoot ? shadowRoot.querySelector('#cb-token-est') : null;
    if (estEl) {
      estEl.textContent = `~${tokens.toLocaleString()} tokens`;
    }
  }

  function calculateStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const tokens = Math.ceil(text.length / 4);
    return { words, tokens };
  }

  function showToast(msg) {
    const toast = shadowRoot.querySelector('#cb-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('cb-show');
    setTimeout(() => {
      toast.classList.remove('cb-show');
    }, 2200);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
})();
