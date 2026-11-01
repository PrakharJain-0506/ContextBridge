/**
 * ContextBridge - Extractor Registry & Platform Detector
 * 
 * Central registry coordinating platform detection and invoking the appropriate
 * platform-specific extractor. Normalizes all conversations into the common format.
 */

const ContextBridgeRegistry = {
  extractors: [],

  /**
   * Register a new platform extractor
   */
  register(extractor) {
    if (!extractor || !extractor.id || typeof extractor.extract !== 'function') {
      console.error('[ContextBridge] Invalid extractor registration:', extractor);
      return;
    }
    // Avoid duplicate registration
    const existingIndex = this.extractors.findIndex(e => e.id === extractor.id);
    if (existingIndex >= 0) {
      this.extractors[existingIndex] = extractor;
    } else {
      this.extractors.push(extractor);
    }
  },

  /**
   * Detect current platform based on hostname and pathname
   */
  detectPlatform(hostname = window.location.hostname, pathname = window.location.pathname) {
    const host = (hostname || '').toLowerCase().trim();
    const path = (pathname || '').toLowerCase();

    for (const extractor of this.extractors) {
      if (typeof extractor.matches === 'function' && extractor.matches(host, path)) {
        return extractor;
      }
    }
    return null;
  },

  /**
   * Extract active conversation using the matched platform extractor,
   * or return an unsupported fallback object.
   */
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
      const result = activeExtractor.extract();

      // Normalize result into common conversation contract
      const normalizedMessages = (result.messages || []).map((m, index) => ({
        id: m.id || `msg-${index + 1}`,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: (m.content || '').trim()
      })).filter(m => m.content.length > 0);

      return {
        platform: activeExtractor.id,
        platformName: activeExtractor.name,
        detected: normalizedMessages.length > 0,
        pageTitle: result.pageTitle || (document.title || '').trim() || `${activeExtractor.name} Session`,
        url: window.location.href,
        capturedAt: result.capturedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: normalizedMessages,
        messageCount: normalizedMessages.length,
        turnCount: Math.ceil(normalizedMessages.length / 2),
        isPartial: true,
        sourceNotice: result.sourceNotice || `ContextBridge captured the conversation currently loaded on ${activeExtractor.name}.`
      };
    } catch (err) {
      console.error(`[ContextBridge] Error extracting from ${activeExtractor.name}:`, err);
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

// Auto-register built-in platform extractors if present in global scope
if (typeof window !== 'undefined') {
  window.ContextBridgeRegistry = ContextBridgeRegistry;

  if (window.ContextBridgeChatGPT) ContextBridgeRegistry.register(window.ContextBridgeChatGPT);
  if (window.ContextBridgeGemini) ContextBridgeRegistry.register(window.ContextBridgeGemini);
  if (window.ContextBridgeClaude) ContextBridgeRegistry.register(window.ContextBridgeClaude);
  if (window.ContextBridgePerplexity) ContextBridgeRegistry.register(window.ContextBridgePerplexity);
  if (window.ContextBridgeCopilot) ContextBridgeRegistry.register(window.ContextBridgeCopilot);
  if (window.ContextBridgeGrok) ContextBridgeRegistry.register(window.ContextBridgeGrok);
}
