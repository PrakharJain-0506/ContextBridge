import JSZip from 'jszip';

export interface ExtensionFileSummary {
  name: string;
  path: string;
  size: string;
  description: string;
  category: 'core' | 'ui' | 'logic' | 'asset' | 'doc';
}

export const EXTENSION_FILES: ExtensionFileSummary[] = [
  {
    name: 'manifest.json',
    path: 'extension/manifest.json',
    size: '560 B',
    description: 'Manifest V3 configuration registering background service worker, activeTab, and content script.',
    category: 'core'
  },
  {
    name: 'background.js',
    path: 'extension/background.js',
    size: '1.4 KB',
    description: 'Service worker responding to toolbar clicks and Command+Shift+K to toggle the in-page lens.',
    category: 'logic'
  },
  {
    name: 'content.js',
    path: 'extension/content.js',
    size: '16.8 KB',
    description: 'Injects the Stitch UI into an isolated Shadow DOM over the active webpage with full persistence.',
    category: 'logic'
  },
  {
    name: 'overlay.css',
    path: 'extension/overlay.css',
    size: '14.2 KB',
    description: 'Complete Stitch design system supporting both Fluid Glass (Dark) and Glass Flow (Light) themes.',
    category: 'ui'
  },
  {
    name: 'README.md',
    path: 'extension/README.md',
    size: '2.4 KB',
    description: 'Documentation for loading unpacked and testing the in-page overlay across AI platforms.',
    category: 'doc'
  },
  {
    name: 'icons/icon16.png',
    path: 'extension/icons/icon16.png',
    size: '148 B',
    description: '16x16 icon for the Chrome extension toolbar.',
    category: 'asset'
  },
  {
    name: 'icons/icon48.png',
    path: 'extension/icons/icon48.png',
    size: '288 B',
    description: '48x48 icon for the Chrome extensions management page.',
    category: 'asset'
  },
  {
    name: 'icons/icon128.png',
    path: 'extension/icons/icon128.png',
    size: '803 B',
    description: '128x128 icon for Chrome Web Store & high-DPI displays.',
    category: 'asset'
  },
  {
    name: 'extractors/registry.js',
    path: 'extension/extractors/registry.js',
    size: '2.1 KB',
    description: 'Central registry detecting host platform and delegating to modular extractors.',
    category: 'logic'
  },
  {
    name: 'extractors/chatgpt.js',
    path: 'extension/extractors/chatgpt.js',
    size: '3.6 KB',
    description: 'Dedicated extractor preserving verified multi-selector turn and role extraction for ChatGPT.',
    category: 'logic'
  },
  {
    name: 'extractors/gemini.js',
    path: 'extension/extractors/gemini.js',
    size: '2.4 KB',
    description: 'Extractor for Google Gemini querying user-query and model-response elements.',
    category: 'logic'
  },
  {
    name: 'extractors/claude.js',
    path: 'extension/extractors/claude.js',
    size: '2.3 KB',
    description: 'Extractor for Claude querying test-ids and message typography wrappers.',
    category: 'logic'
  },
  {
    name: 'extractors/perplexity.js',
    path: 'extension/extractors/perplexity.js',
    size: '2.2 KB',
    description: 'Extractor for Perplexity querying user queries and markdown prose blocks.',
    category: 'logic'
  },
  {
    name: 'extractors/copilot.js',
    path: 'extension/extractors/copilot.js',
    size: '2.2 KB',
    description: 'Extractor for Microsoft Copilot parsing CIB message turns and author roles.',
    category: 'logic'
  },
  {
    name: 'extractors/grok.js',
    path: 'extension/extractors/grok.js',
    size: '2.1 KB',
    description: 'Extractor for Grok parsing message bubbles and markdown response blocks.',
    category: 'logic'
  },
  {
    name: 'extractors/common.js',
    path: 'extension/extractors/common.js',
    size: '1.8 KB',
    description: 'Shared utilities for text normalization, code blocks, and DOM order sorting.',
    category: 'logic'
  }
];

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Try fetching the live files from /public/extension/
  const filesToFetch = [
    { name: 'manifest.json', path: '/extension/manifest.json' },
    { name: 'background.js', path: '/extension/background.js' },
    { name: 'content.js', path: '/extension/content.js' },
    { name: 'overlay.css', path: '/extension/overlay.css' },
    { name: 'README.md', path: '/extension/README.md' },
    { name: 'extractors/registry.js', path: '/extension/extractors/registry.js' },
    { name: 'extractors/common.js', path: '/extension/extractors/common.js' },
    { name: 'extractors/chatgpt.js', path: '/extension/extractors/chatgpt.js' },
    { name: 'extractors/gemini.js', path: '/extension/extractors/gemini.js' },
    { name: 'extractors/claude.js', path: '/extension/extractors/claude.js' },
    { name: 'extractors/perplexity.js', path: '/extension/extractors/perplexity.js' },
    { name: 'extractors/copilot.js', path: '/extension/extractors/copilot.js' },
    { name: 'extractors/grok.js', path: '/extension/extractors/grok.js' }
  ];

  for (const f of filesToFetch) {
    try {
      const res = await fetch(f.path);
      if (res.ok) {
        zip.file(f.name, await res.text());
      }
    } catch {
      console.warn(`Could not fetch ${f.path}`);
    }
  }

  // Icons folder
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    try {
      const svgRes = await fetch('/extension/icons/icon.svg');
      if (svgRes.ok) {
        iconsFolder.file('icon.svg', await svgRes.text());
      }
    } catch {}

    for (const size of [16, 48, 128]) {
      try {
        const pngRes = await fetch(`/extension/icons/icon${size}.png`);
        if (pngRes.ok) {
          const blob = await pngRes.blob();
          iconsFolder.file(`icon${size}.png`, blob);
        }
      } catch {}
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contextbridge-overlay-extension-v1.1.0.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
