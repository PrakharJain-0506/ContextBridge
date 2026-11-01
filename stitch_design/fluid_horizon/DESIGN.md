---
name: Fluid Horizon
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb0cd'
  on-tertiary: '#640039'
  tertiary-container: '#f751a1'
  on-tertiary-container: '#570032'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  mono-code:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system establishes an ethereal, context-preserving workspace designed for ambient browser integration. Positioned at the intersection of macOS Sequoia's pristine optical clarity, Linear's crisp micro-density, and Gemini’s fluid luminescence, it presents a workspace that feels less like software and more like a focused optical lens suspended over the user’s active web context.

The brand archetype is the quiet catalyst: silent, intelligent, low-friction, and profoundly stable. Rather than shouting for attention, it provides cognitive sanctuary amidst chaotic browser sessions across fragmented AI platforms (ChatGPT, Claude, Perplexity, Gemini). 

The visual style blends **Refined Glassmorphism** with **Atmospheric Fluid Depth**:
- **Optical Transparency**: Interfaces act as frosted liquid lenses using stacked variable backdrop blurs, ensuring underlying work remains contextually legible while receding gracefully into the ambient background.
- **Spectral Iridescence**: Surfaces do not rely on static grays; they catch ambient caustic light—periwinkle, gentle lavender, soft peach, and ionized electric blue.
- **Tactile Weightlessness**: UI elements float on dynamic focal planes with sub-pixel structural borders, micro-specular light rims, and balanced spatial dissipation.

## Colors

The palette is engineered around chromatic luminosity and optical diffusion across two distinct lighting modes:

### Dark Theme: "Fluid Glass" (Default)
- **Neutral Core**: The structural foundation utilizes deep void charcoal `#090D16` and obsidian navy `#0E131F`. Rather than raw carbon blacks, shadows and backdrops maintain blue-indigo light paths.
- **Accents & Light Paths**: Electric Blue `#3B82F6` and Soft Violet `#8B5CF6` provide primary and secondary dynamic cues, accented by an ionized pulse of Pink/Peach `#EC4899` to delineate context transitions.
- **Text & Contrast**: High-specular pure white (`rgba(255, 255, 255, 0.96)`) for primary headlines, mist blue-slate (`rgba(203, 213, 225, 0.72)`) for secondary context, and deep dusk (`rgba(148, 163, 184, 0.44)`) for metadata.

### Light Theme: "Glass Flow"
- **Neutral Core**: Optical milk white (`rgba(255, 255, 255, 0.72)`) layered over an ambient warm frost tint (`#F8FAFC`).
- **Accents & Refraction**: Delicate periwinkle `#4F46E5`, clear cerulean `#0284C7`, and warm peach `#FB923C` simulate daylight prism effects over translucent surfaces.
- **Text & Contrast**: Crisp midnight navy (`#0F172A`) ensures AAA contrast against high-key frosted panels, supported by deep slate (`#475569`) for running context notes.

### Spectral Gradients & Highlights
- **Prism Edge**: A linear gradient running `rgba(255, 255, 255, 0.16)` to `rgba(255, 255, 255, 0.02)` at 135 degrees creates a hairline specular rim on active cards.
- **Flow Aura**: Subtle, slow-shifting mesh gradients (Electric Indigo to Periwinkle at 6% opacity) run beneath active context blocks to indicate alive, syncing AI bridges.

## Typography

The typography strategy pairs **Plus Jakarta Sans** for structural headlines and anchor narratives with **Inter** for contextual precision, continuous reading, and tabular metadata.

- **Plus Jakarta Sans** introduces subtle geometric warmth, rounded junctions, and modern optimism into main status headers, empty states, and modal titles without sacrificing horizontal economy.
- **Inter** handles high-density text fragments, context items, markdown previews, prompts, and interface actions. Its optical sizing characteristics and neutral counters ensure absolute legibility even when rendered over active, semi-transparent frosted backdrops.
- **Optical Tuning**: Tight negative tracking (`-0.03em` to `-0.015em`) is applied systematically across titles to create a unified, intentional editorial aesthetic reminiscent of native desktop applications. Micro labels (`label-sm`) utilize positive tracking (`0.04em`) with uppercase transformation to anchor functional categorization flags (e.g., `IN PROGRESS`, `RESOLVED`, `NEXT`).

## Layout & Spacing

Because this system governs an ambient browser extension overlay, layout architecture follows a **Constrained Contextual Canvas** model.

### Viewport Overlay & Structural Limits
- **The Central Modal Surface**: Bound to a maximum width of `640px` and an adaptive max height of `82vh`. It sits centered with a dynamic `margin` perimeter of `1.25rem` from the browser viewport edges.
- **Internal Column Grid**: Inside cards and rows, an implicit 8-column micro-grid governs spacing with uniform `gutter` gaps (`0.75rem`), accommodating split context paths (source chat preview on left, unified bridge task on right).

### Spatial Hierarchy & Rhythm
- **Rhythm Multiplier**: All vertical and horizontal spatial increments strictly adhere to a `4px` baseline (`0.25rem`, `0.5rem`, `0.75rem`, `1.25rem`, `1.75rem`).
- **Context Blocks**: Compact vertical padding ensures dense yet uncluttered scannability. Content groups utilize `space-md` for related items and `space-xl` between major context buckets (`Work in Progress` vs. `Next steps`).
- **Responsive Adaptations**:
  - **Compact Overlay View (Flyout/Sidebar Mode)**: When pinned to browser edges, margins reduce to `0.5rem`, horizontal paddings shift from `space-lg` to `space-md`, and multi-column comparison cards stack vertically.
  - **Full Bridge Modal**: Centered modal maintains balanced breathing room with `space-lg` inner padding, prioritizing cognitive clarity over maximum data density.

## Elevation & Depth

Visual hierarchy is maintained through optical layering, refraction, and specular lighting rather than standard opaque drop shadows.

### Atmospheric Planes
1. **Underlying Browser Canvas (Plane 0)**: Dimmed and unified via a full-screen backdrop filter (`backdrop-filter: blur(12px) brightness(0.65)` in dark mode, `blur(8px) brightness(0.95)` in light mode).
2. **Glass Base Shield (Plane 1)**: The primary floating container. Built with `rgba(14, 19, 31, 0.78)` (dark) or `rgba(255, 255, 255, 0.78)` (light), paired with `backdrop-filter: blur(32px) saturate(180%)`. Edge definition is created by a 1px border gradient tinted with white light specular falloff at the top edge (`rgba(255, 255, 255, 0.18)`) receding to invisible transparency at the bottom edge.
3. **Floating Context Tiles (Plane 2)**: Sub-panels for individual tasks and context captures. Built with `rgba(255, 255, 255, 0.04)` (dark) and `rgba(255, 255, 255, 0.60)` (light), complemented by soft ambient inner bevels (`inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`).
4. **Specular Focus & Overlays (Plane 3)**: Active tooltips, dropdown menus, and elevated CTAs. Augmented by a twin-layer ethereal glow: `0 8px 32px -4px rgba(0, 0, 0, 0.45)`, alongside a chromatic aura matching the primary tone (`0 0 24px -2px rgba(59, 130, 246, 0.25)`).

### Lighting Directionality
A persistent, subtle light source is cast from top-center (180°), creating a natural downward drop-off on all borders, bevels, and specular highlights.

## Shapes

The design system embraces a **Modern Smooth Curvature** philosophy, reflecting hardware-grade precision reminiscent of native operating system windows.

- **Base Radius Tokens**:
  - `rounded-base` (`0.5rem` / `8px`): Checkboxes, micro badges, segmented control pills, code snippets.
  - `rounded-lg` (`1rem` / `16px`): Inner context cards, inputs, expandable task rows, context summary tiles.
  - `rounded-xl` (`1.5rem` / `24px`): The master container window, persistent floating dock modules, hero spotlight cards.
  - `rounded-full` (`9999px`): Action CTAs, filter chips, theme toggles, and status indicators.
- **Squircle Continuity**: All bounding frames prioritize continuous curvature (`corner-smoothing: 60%` where rendering engines allow) to prevent visual harshness when resting against varied web typography and arbitrary page content behind the overlay.

## Components

### 1. Centered Floating Glass Overlay
The master workspace layer. Suspended in viewport center via an entrance transition with subtle spring physics (`scale: 0.98 -> 1.0`, `opacity: 0 -> 1`). Features an integrated top drag handle, ambient search/prompt bar, and a persistent translucent bottom dock containing sync statuses across detected models (e.g., Claude, ChatGPT tabs).

### 2. Context Capture Rows
Interactive, collapsible rows categorized by status:
- **Work in Progress**: Highlighted with an iridescent left light indicator (pulsing cerulean glow). Houses live extracted prompts and draft code.
- **Completed Work**: Subdued opacity (`0.75`), featuring struck-through accent metadata, crisp check badges, and destination platform tags.
- **Next Steps**: Dotted inner outline border, actionable AI suggestion triggers ("Bridge to Claude", "Synthesize via Gemini"). Hovering produces a soft ambient illumination behind the row.

### 3. Decorative Connection Card ("Your context, across every AI")
An atmospheric centerpiece card embedded within the workspace:
- **Background**: Subtle liquid gradient moving infinitely through deep charcoal, electric indigo, and warm periwinkle.
- **Visual Motif**: Delicate vector nodes linked by luminous micro-splines, visually unifying disparate AI vendor logos via glowing glass spheres.
- **Typography**: Display-level gradient text mask (`headline-sm`) transitioning from crystalline white to lavender.

### 4. Pill CTA Buttons with Gradient Highlights
- **Primary Action**: Pill shape (`rounded-full`) filled with deep obsidian/charcoal glass, encased in an active linear gradient stroke (Electric Blue to Soft Violet). On hover, an internal radiant glow illuminates the button interior from the mouse position.
- **Secondary Action**: Borderless frosted glass pill (`rgba(255, 255, 255, 0.06)`), shifting to `rgba(255, 255, 255, 0.12)` on interaction with crisp typography.

### 5. Smooth Theme Switcher
Segmented dual-pill switch situated in the window header:
- Contains micro vector icons for Sun (warm ray refraction) and Moon (deep orbital crescent).
- The active slider pill is made of polished frosted glass with a light specular top edge, gliding with smooth spring momentum over the recessed dark track.

### 6. Chips & Model Indicators
Compact pills indicating source origins (`ChatGPT-4o`, `Claude 3.5 Sonnet`, `Perplexity`). Decorated with a 6px model status dot (green: active session; purple: synchronized bridge; gray: idle) and set in `label-sm` monospaced optical sizing.

### 7. Inputs & Synthesis Fields
Borderless floating text fields sitting directly inside frosted recessed containers. Focus states replace the generic browser ring with an all-around optical halo (`box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.15)`).