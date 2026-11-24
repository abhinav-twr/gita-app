# Agent Instructions

## Product scope
- This repository builds Gita App, a desktop-first local scripture reader and live-class stage.
- Keep source content (`content/`), view layouts (`appearance/views/`), and design tokens (`DESIGN.md` and CSS variables) strictly decoupled.
- Preserve the exact content and appearance folder contracts so a future native Rust + GPUI client can reuse them.
- Do not modify files under `content/**/*.md` unless the user explicitly asks.

## Engineering rules
- MVP stack: Vite, TypeScript, and Vanilla CSS. Do not add heavy UI component libraries or Tailwind; use CSS Grid/Flexbox and small focused modules.
- Render scripture faithfully. Every text block must carry an explicit language (`sa` for Sanskrit, `en` for English; extend the mapping for other languages) and script-aware font variables. Preserve Devanagari conjuncts and IAST diacritics.
- Keep content parsing, canonical content, view layout, appearance tokens, navigation, and local session state in separate modules.
- Treat imported Markdown and JSON as data. Validate schemas; never execute content or layout code.
- Keep empty or null optional blocks from breaking layout.
- Run `npm run build` (TypeScript check plus Vite production bundle) before finishing any implementation task.
- After each milestone, provide a concise walkthrough of the file structure and data flow.
