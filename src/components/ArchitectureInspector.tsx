import React, { useState } from 'react';
import {
  FileCode,
  FileText,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Download,
  Info,
  Sparkles
} from 'lucide-react';
import { EXTENSION_FILES, downloadExtensionZip } from '../services/extensionExporter';

const FILE_CONTENTS: Record<string, string> = {
  'manifest.json': `{
  "manifest_version": 3,
  "name": "ContextBridge - AI Context Portability",
  "version": "1.1.0",
  "description": "Cross-AI working context bridge that lives as an intelligent in-page lens overlay over your active tab.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Toggle ContextBridge Lens (Ctrl+Shift+K or Cmd+Shift+K)"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+K",
        "mac": "Command+Shift+K"
      },
      "description": "Toggle ContextBridge in-page overlay"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["overlay.css", "icons/*"],
      "matches": ["<all_urls>"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`,

  'background.js': `/**
 * ContextBridge - Service Worker (Manifest V3)
 * Manages extension action clicks and hotkeys to trigger the in-page overlay
 * on the currently active tab.
 */

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await toggleOverlayOnTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await toggleOverlayOnTab(tab);
    }
  }
});

async function toggleOverlayOnTab(tab) {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_CONTEXTBRIDGE_OVERLAY'
    });
    if (response && response.status === 'ok') return;
  } catch {
    // If content script was not yet active on the tab, inject it on-demand
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_CONTEXTBRIDGE_OVERLAY'
    });
  }
}`,

  'content.js': `/**
 * ContextBridge - In-Page Overlay Content Script (Manifest V3)
 * Injects and manages the floating ContextBridge Lens modal directly over the user's
 * active webpage using Shadow DOM for style isolation.
 */
(function () {
  if (window.__CONTEXTBRIDGE_INJECTED__) return;
  window.__CONTEXTBRIDGE_INJECTED__ = true;

  const STORAGE_KEY = 'contextbridge_saved_items';
  const THEME_KEY = 'contextbridge_theme_preference';

  let overlayHost = null;
  let shadowRoot = null;
  let isVisible = false;
  let currentTheme = 'dark'; // 'dark' (Fluid Glass) or 'light' (Glass Flow)

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_CONTEXTBRIDGE_OVERLAY') {
      toggleOverlay();
      sendResponse({ status: 'ok', isVisible });
      return true;
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isVisible) hideOverlay();
  });

  async function toggleOverlay() {
    if (!overlayHost) await initializeOverlay();
    isVisible ? hideOverlay() : showOverlay();
  }
  ...
})();`,

  'overlay.css': `/* ContextBridge In-Page Overlay Stitch UI Design System */
:host {
  all: initial;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
}

/* DARK THEME: "Fluid Glass" */
.cb-overlay-theme-dark {
  --cb-bg-scrim: rgba(0, 0, 0, 0.62);
  --cb-surface-modal: rgba(13, 17, 26, 0.88);
  --cb-modal-border: rgba(255, 255, 255, 0.10);
  --cb-accent-primary: #adc6ff;
  --cb-specular-lip: linear-gradient(90deg, transparent, rgba(173, 198, 255, 0.6), transparent);
}

/* LIGHT THEME: "Glass Flow" */
.cb-overlay-theme-light {
  --cb-bg-scrim: rgba(15, 23, 42, 0.28);
  --cb-surface-modal: rgba(255, 255, 255, 0.90);
  --cb-modal-border: rgba(255, 255, 255, 0.85);
  --cb-accent-primary: #4f46e5;
  --cb-specular-lip: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
}

.cb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483640;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
...`,

  'README.md': `# ContextBridge — In-Page Lens Overlay Extension (Manifest V3)

Instead of a small 400px popup, ContextBridge lives directly as a floating frosted glass lens on top of your active webpage.

## How to Test in Google Chrome:
1. Open Google Chrome.
2. Go to chrome://extensions.
3. Turn ON "Developer mode".
4. Click "Load unpacked" and select the extension folder.
5. Open Claude, ChatGPT, Gemini, Perplexity, Copilot, or Grok and click the ContextBridge toolbar icon (or press Cmd+Shift+K).
6. The webpage remains visible while the ContextBridge overlay floats above!`,

  'extractors/registry.js': `/**
 * ContextBridge - Central Extractor Registry
 * Detects current AI platform based on hostname and delegates to modular extractors.
 */
class ContextBridgeRegistry {
  constructor() {
    this.extractors = new Map();
  }

  register(extractor) {
    this.extractors.set(extractor.id, extractor);
  }

  detectPlatform(hostname = window.location.hostname, pathname = window.location.pathname) {
    const host = (hostname || '').toLowerCase();
    for (const [id, extractor] of this.extractors.entries()) {
      if (extractor.matches(host, pathname)) {
        return { platform: id, name: extractor.name, extractor };
      }
    }
    return { platform: 'unsupported', name: 'Unsupported Platform', extractor: null };
  }

  extractActiveConversation() {
    const detected = this.detectPlatform();
    if (!detected.extractor) {
      return { platform: 'unsupported', detected: false, messages: [] };
    }
    return detected.extractor.extract();
  }
}`,

  'extractors/chatgpt.js': `/**
 * ContextBridge - ChatGPT Extractor
 * Preserves multi-selector, role-priority, and turn container extraction for ChatGPT.
 */
class ChatGPTExtractor {
  constructor() {
    this.id = 'chatgpt';
    this.name = 'ChatGPT';
  }

  matches(hostname) {
    return hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com') ||
           hostname === 'chat.openai.com' || hostname.endsWith('.chat.openai.com');
  }

  extract() {
    // Collect from data-message-author-role, article[data-testid^="conversation-turn-"]
    const messages = [];
    // Extracts user and assistant turns with zero hallucination
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/gemini.js': `/**
 * ContextBridge - Google Gemini Extractor
 * Queries Angular custom elements <user-query> and <model-response>.
 */
class GeminiExtractor {
  constructor() {
    this.id = 'gemini';
    this.name = 'Google Gemini';
  }

  matches(hostname) {
    return hostname === 'gemini.google.com' || hostname === 'bard.google.com';
  }

  extract() {
    const messages = [];
    const elements = document.querySelectorAll('user-query, model-response, .user-query-container, .model-response-container');
    // Iterates in DOM document order and normalizes markdown content
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/claude.js': `/**
 * ContextBridge - Claude Extractor
 * Targets data-testid="user-message" and data-testid="assistant-message".
 */
class ClaudeExtractor {
  constructor() {
    this.id = 'claude';
    this.name = 'Claude';
  }

  matches(hostname) {
    return hostname === 'claude.ai' || hostname.endsWith('.claude.ai');
  }

  extract() {
    const messages = [];
    // Queries Claude test-ids and message typography containers
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/perplexity.js': `/**
 * ContextBridge - Perplexity Extractor
 * Queries user-query elements and markdown prose response blocks.
 */
class PerplexityExtractor {
  constructor() {
    this.id = 'perplexity';
    this.name = 'Perplexity';
  }

  matches(hostname) {
    return hostname === 'perplexity.ai' || hostname.endsWith('.perplexity.ai');
  }

  extract() {
    const messages = [];
    // Extracts questions and prose answers while stripping citation chips
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/copilot.js': `/**
 * ContextBridge - Microsoft Copilot Extractor
 * Queries CIB turns and data-author attributes.
 */
class CopilotExtractor {
  constructor() {
    this.id = 'copilot';
    this.name = 'Microsoft Copilot';
  }

  matches(hostname) {
    return hostname.includes('copilot.microsoft.com') || hostname.includes('bing.com');
  }

  extract() {
    const messages = [];
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/grok.js': `/**
 * ContextBridge - Grok Extractor
 * Queries message bubbles and markdown response blocks on grok.com and x.com/i/grok.
 */
class GrokExtractor {
  constructor() {
    this.id = 'grok';
    this.name = 'Grok';
  }

  matches(hostname, pathname = '') {
    return hostname === 'grok.com' || ((hostname === 'x.com' || hostname === 'twitter.com') && pathname.includes('/grok'));
  }

  extract() {
    const messages = [];
    return {
      platform: this.id,
      platformName: this.name,
      detected: messages.length > 0,
      messages
    };
  }
}`,

  'extractors/common.js': `/**
 * ContextBridge - Extractor Common Helpers
 * DOM text normalization, code block preservation, and document order sorting.
 */
const ContextBridgeCommon = {
  extractCleanText(element) { ... },
  sortByDocumentPosition(elements) { ... }
};`
};

const FILE_EXPLANATIONS: Record<string, { role: string; keyPoints: string[]; beginnerNote: string }> = {
  'manifest.json': {
    role: 'Extension Identity & Permission Blueprint (Manifest V3)',
    keyPoints: [
      '"background": { "service_worker": "background.js" } enables the extension to listen for icon clicks and hotkeys without keeping a background page open.',
      '"action": {} declares toolbar interaction without a static default_popup, allowing dynamic in-page overlay injection.',
      '"commands": { "_execute_action" } registers Cmd+Shift+K / Ctrl+Shift+K system shortcuts.',
      '"content_scripts" and "web_accessible_resources" register content.js and overlay.css for injection into active web tabs.'
    ],
    beginnerNote: 'In Manifest V3, extensions use lightweight service workers instead of persistent background pages, saving memory and battery life.'
  },
  'background.js': {
    role: 'Service Worker & Overlay Trigger Dispatcher',
    keyPoints: [
      'Listens for chrome.action.onClicked and chrome.commands.onCommand.',
      'Finds the user\'s active browser tab and sends a TOGGLE_CONTEXTBRIDGE_OVERLAY message.',
      'Includes fallback on-demand injection using chrome.scripting.executeScript for pages opened before the extension was loaded.'
    ],
    beginnerNote: 'The service worker acts like an air traffic controller: it notices when you click the extension icon and tells the webpage to reveal the lens overlay.'
  },
  'content.js': {
    role: 'In-Page Shadow DOM & Multi-Platform Controller',
    keyPoints: [
      'Uses element.attachShadow({ mode: "open" }) to create a protected style boundary.',
      'Houses the modular ContextBridgeRegistry which dynamically identifies ChatGPT, Gemini, Claude, Perplexity, Copilot, or Grok.',
      'Renders the complete Stitch UI design with 2-column layout, SVG mesh constellation, and dual themes.',
      'Manages local persistence via chrome.storage.local without any external cloud calls.'
    ],
    beginnerNote: 'Shadow DOM lets our extension render right on top of any AI platform without inheriting messy CSS conflicts from the host site.'
  },
  'overlay.css': {
    role: 'Dual-Theme Stitch Design System (Fluid Horizon)',
    keyPoints: [
      'Implements "Fluid Glass" (Dark): deep obsidian charcoal (#0d111a), specular light edges, and electric blue/indigo glow.',
      'Implements "Glass Flow" (Light): frosted milk glass, warm ambient pastel caustics, and crisp midnight navy typography.',
      'Uses backdrop-filter: blur(28px) to keep the host webpage recognizable yet non-primary.'
    ],
    beginnerNote: 'By scoping styles inside the Shadow DOM using CSS custom variables (--cb-*), switching between light and dark mode happens instantly with zero repaints.'
  },
  'extractors/registry.js': {
    role: 'Central Platform Registry & Router',
    keyPoints: [
      'Inspects window.location.hostname to identify the active AI platform.',
      'Delegates to the specific platform extractor module.',
      'Returns a normalized conversation format across all platforms, enabling easy addition of future AI services.'
    ],
    beginnerNote: 'The registry acts like a universal adapter: no matter which AI platform you are using, ContextBridge converts the chat into one uniform format.'
  },
  'extractors/chatgpt.js': {
    role: 'ChatGPT Turn & Role Extractor',
    keyPoints: [
      'Preserves the thoroughly verified multi-selector query sequence for chatgpt.com.',
      'Prioritizes data-message-author-role attributes and conversation-turn article elements.',
      'Filters out transient UI artifacts, copy buttons, and audio player nodes.'
    ],
    beginnerNote: 'Guarantees reliable, zero-loss extraction on ChatGPT without breaking existing verified flows.'
  },
  'extractors/gemini.js': {
    role: 'Google Gemini Angular Extractor',
    keyPoints: [
      'Queries Gemini-specific custom elements: <user-query> and <model-response>.',
      'Preserves code blocks and markdown lists while removing TTS audio buttons.',
      'Normalizes output into common { role, content } turns.'
    ],
    beginnerNote: 'Custom elements on gemini.google.com are neatly parsed into clean conversation turns.'
  },
  'extractors/claude.js': {
    role: 'Claude React Component Extractor',
    keyPoints: [
      'Extracts conversation turns using data-testid="user-message" and data-testid="assistant-message".',
      'Normalizes multi-paragraph assistant answers and code fences.',
      'Maintains sequential document order.'
    ],
    beginnerNote: 'Extracts Claude discussions cleanly so you can bridge them directly to other AI models.'
  },
  'extractors/perplexity.js': {
    role: 'Perplexity Search & Answer Extractor',
    keyPoints: [
      'Extracts user research queries alongside markdown prose answers.',
      'Strips citation superscript chips and source buttons from the resulting package.'
    ],
    beginnerNote: 'Captures full Perplexity research answers without noisy citation numbers.'
  },
  'extractors/copilot.js': {
    role: 'Microsoft Copilot Extractor',
    keyPoints: [
      'Handles both modern Copilot layouts and Bing Chat web components.',
      'Normalizes bot responses and user prompts.'
    ],
    beginnerNote: 'Bridges Microsoft Copilot work sessions into your other preferred AI tools.'
  },
  'extractors/grok.js': {
    role: 'Grok Extractor',
    keyPoints: [
      'Extracts conversation turns from grok.com and x.com/i/grok.',
      'Captures user prompts and markdown responses.'
    ],
    beginnerNote: 'Extracts Grok conversations seamlessly.'
  },
  'extractors/common.js': {
    role: 'Shared Text & DOM Normalization Utilities',
    keyPoints: [
      'Converts <pre><code> blocks into formatted markdown fences with syntax tagging.',
      'Orders DOM elements by Node.DOCUMENT_POSITION_FOLLOWING to guarantee chronological turns.',
      'Cleans up excessive whitespace and unwanted UI action buttons.'
    ],
    beginnerNote: 'Provides shared helpers so each platform extractor stays concise and bug-free.'
  },
  'README.md': {
    role: 'Installation & Testing Documentation',
    keyPoints: [
      'Step-by-step developer mode guide for Chrome.',
      'Explains hotkey shortcuts (Cmd+Shift+K, Esc).',
      'Walks through the cross-AI testing flow across all 6 supported platforms.'
    ],
    beginnerNote: 'Keep instructions clear and actionable so anyone can load and test your extension in under 60 seconds.'
  }
};

export const ArchitectureInspector: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState('manifest.json');
  const [copied, setCopied] = useState(false);

  const activeContent = FILE_CONTENTS[selectedFile] || '// Select a file';
  const explanation = FILE_EXPLANATIONS[selectedFile] || {
    role: 'Extension Component',
    keyPoints: [],
    beginnerNote: ''
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>ContextBridge Architecture &amp; File Breakdown</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Updated to the required In-Page Overlay architecture. Inspect every file in the package and understand why Manifest V3 service workers and Shadow DOM are used.
          </p>
        </div>

        <button
          onClick={() => downloadExtensionZip()}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download All Files (.zip)</span>
        </button>
      </div>

      {/* Grid: File Navigator + Code Viewer + Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Tabs & Explorer (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Extension Files
          </span>

          <div className="space-y-1.5">
            {EXTENSION_FILES.map(file => {
              const isSelected = selectedFile === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {file.category === 'core' && <Layers className="w-3.5 h-3.5 text-amber-400" />}
                    {file.category === 'ui' && <FileCode className="w-3.5 h-3.5 text-sky-400" />}
                    {file.category === 'logic' && <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                    {file.category === 'doc' && <FileText className="w-3.5 h-3.5 text-slate-400" />}
                    {file.category === 'asset' && <FileText className="w-3.5 h-3.5 text-purple-400" />}
                    <span className="text-xs font-mono font-medium truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
                    {file.size}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Concept Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Shadow DOM Style Isolation</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              By using <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">attachShadow({'{'} mode: 'open' {'}'})</code> in <code className="text-sky-300 font-mono">content.js</code>, our Stitch UI runs in its own private subtree. Host page styles cannot interfere with our modal, guaranteeing optical clarity on any website.
            </p>
          </div>
        </div>

        {/* Center Column: Code Viewer (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-t-xl">
            <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <span>extension/</span>
              <strong className="text-sky-400">{selectedFile}</strong>
            </span>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-b-xl bg-slate-950 border border-t-0 border-slate-800 text-xs font-mono text-slate-300 max-h-[560px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
            {activeContent}
          </pre>
        </div>

        {/* Right Column: Beginner Explanation & Architectural Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                Architecture Role
              </span>
              <h2 className="text-sm font-bold text-slate-100 mt-1">
                {explanation.role}
              </h2>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Key Responsibilities:</span>
              <ul className="space-y-2 text-xs text-slate-400">
                {explanation.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-sky-400 font-bold shrink-0">·</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Beginner takeaway</span>
              </span>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {explanation.beginnerNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
