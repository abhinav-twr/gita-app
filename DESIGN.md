# Design System

Inspired by Obsidian Minimal. Interface chrome stays quiet so scripture is the focus. Use Vanilla CSS Grid/Flexbox, thin borders, restrained transitions, and no heavy UI library.

## Color themes

Define these as CSS custom properties. `minimal-dark` is the default.

| Token | minimal-dark | true-black | warm-light |
|---|---|---|---|
| Canvas | `#202020` | `#000000` | `#f7f5f0` |
| Sidebar | `#161616` | `#0a0a0a` | `#efece4` |
| Elevated surface | `#262626` | `#121212` | `#ffffff` |
| Border | `#333333` | `#222222` | `#dcd7cb` |
| Primary text | `#dadada` | `#e4e4e4` | `#1f1e1b` |
| Muted text | `#999999` | `#888888` | `#6b675e` |
| Accent | `#eab308` | `#eab308` | `#b45309` |

CSS variable names: `--canvas`, `--sidebar`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`.

## Typography

- Sanskrit Devanagari (`lang="sa"`): `'Noto Serif Devanagari', serif`; line-height `1.85` to protect upper and lower matras.
- English and IAST (`lang="en"`): `'Literata', 'Noto Serif', Georgia, serif`; scripture line-height `1.7`; study measure `72ch`.
- UI chrome: `'Inter', system-ui, sans-serif`.
- Every content block declares its language and uses script-aware font variables. Keep Unicode text unchanged and allow font fallback.

## Interaction and layout

Stage view targets 16:9 screensharing; study view prioritizes a readable vertical column. Hidden blocks collapse or disappear and remaining blocks reflow without blank grid tracks. Theme changes apply at the app root and never alter source content or view JSON.
