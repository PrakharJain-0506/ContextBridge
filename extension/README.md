# ContextBridge — In-Page Lens Overlay Extension (Manifest V3)

**ContextBridge** is an intelligent browser overlay for seamless AI context portability between **Claude**, **ChatGPT**, **Gemini**, and **Cursor**.

Instead of opening a separate tab or a small 400px popup, **ContextBridge lives directly as a floating frosted glass lens on top of your active webpage**.

---

## 🌟 How the In-Page Overlay Experience Works

```text
User is actively working on Claude / ChatGPT / Gemini / any web page
                             ↓
User clicks ContextBridge icon (or presses Cmd+Shift+K / Ctrl+Shift+K)
                             ↓
The current webpage remains softly visible in the background
                             ↓
A subtle translucent backdrop blur appears
                             ↓
The ContextBridge Stitch Lens floats above your workspace
```

---

## 🎨 Dual Stitch Themes Supported

1. **Dark Theme — Fluid Glass** (Default):
   - Deep charcoal/navy translucent glass panel (`#0d111a`/88)
   - Top specular gradient light lip
   - Electric Blue (`#4d8eff`), Soft Violet (`#d0bcff`), and Ionized Peach accents
   - High-specular white headlines and mist blue-slate context text
   - Luminous micro-spline topology visualization

2. **Light Theme — Glass Flow**:
   - Frosted optical milk glass (`rgba(255, 255, 255, 0.90)`)
   - Ambient warm pastel refraction glow (indigo, sky, peach)
   - Crisp midnight navy typography with high WCAG contrast
   - Periwinkle and cerulean signal paths

---

## 🚀 How to Install in Google Chrome

1. **Extract Extension Folder**:
   - Download or extract this `extension` directory (containing `manifest.json`, `background.js`, `content.js`, `overlay.css`, and `icons/`).
2. **Open Chrome Extensions**:
   - In Google Chrome, go to `chrome://extensions`.
3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch at the top-right to **ON**.
4. **Load Unpacked**:
   - Click **Load unpacked** in the top-left corner.
   - Select this `extension` folder.
5. **Pin to Toolbar**:
   - Click the Extensions puzzle piece in Chrome and pin **ContextBridge**.

---

## 🧪 Testing the In-Page Overlay Workflow

1. Open **Claude** (`https://claude.ai`), **ChatGPT** (`https://chatgpt.com`), or any webpage.
2. Click the **ContextBridge** icon in Chrome's toolbar (or press `Cmd+Shift+K` / `Ctrl+Shift+K`).
3. Notice that your webpage **remains visible** beneath a subtle backdrop blur.
4. Switch themes between **Fluid Glass** and **Glass Flow** using the header pill toggle.
5. Fill in your context (or click **Presets ▾** for auto-fill).
6. Click **Generate Context** to inspect the structured context package with live token stats.
7. Click **Copy Package** to copy directly to your clipboard.
8. Click **Save Locally** to persist it in `chrome.storage.local`.
9. Click the close button, click the backdrop, or hit `Esc` to return to your normal webpage.

---

## 📁 Architecture Overview

- **`manifest.json`**: Manifest V3 declaration with `activeTab`, `scripting`, and `storage` permissions, registering `background.js` as the service worker and `content.js` as the content script.
- **`background.js`**: Background service worker responding to toolbar clicks and hotkeys, dispatching toggle signals to the active tab.
- **`content.js`**: Injects an isolated **Shadow DOM** (`#contextbridge-overlay-root`) into the current page so host page CSS cannot leak in or break the overlay.
- **`overlay.css`**: Complete Stitch UI styles, animations, variables, and typography.
- **`icons/`**: Extension toolbar and web store icons.
