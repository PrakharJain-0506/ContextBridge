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
    { name: 'README.md', path: '/extension/README.md' }
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
