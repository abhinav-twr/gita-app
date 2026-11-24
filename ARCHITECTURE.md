# Architecture

## Product boundary

Gita App is a local-first desktop web application for live scripture presentation and focused reading. MVP uses Vite, TypeScript, and Vanilla CSS. A future native Rust + GPUI client must reuse `content/` and `appearance/` without changing their contracts.

## Decoupled data flow

```text
Content Folder -> Markdown Parser -> Canonical Content Library
                                      -> Search / Navigation
Appearance Views -> View Validator -> View Engine -> Dynamic Grid Reflow
Design Tokens -------------------------------------> Reader / Stage Canvas
```

Source content never contains view layout or theme choices. View JSON references semantic content block types and regions. Design tokens style those blocks without changing their meaning.

## Canonical content identity

Verse IDs use `<book_id>:[<canto>.]<chapter>.<verse>`:

- Bhagavad Gita: `bg:10.1`
- Future multi-canto book: `sb:10.82.1`

A parsed verse stores its canonical ID, book/chapter metadata, source asset, language, speaker, artwork, tags, Sanskrit, transliteration, word meanings, translation, and purport. Optional content may be absent or null.

## Content parser

Vite discovers `content/**/*.md` files at build time with `import.meta.glob`; edits trigger Vite HMR. A parser reads YAML frontmatter and `## Verse <n>` sections, then normalizes headings into a typed canonical library. Inline Markdown remains renderable as formatted text; raw HTML and executable content are not trusted. Grouped headings and cross-reference placeholders are resolved after all verses have been parsed, so references can point forward or backward. Unresolved references remain readable and do not crash the reader.

## View engine

The view engine accepts a canonical verse, a validated view definition, and an appearance theme. It renders only registered safe block types. Missing content yields no block. In edit mode, visibility, ordering, region, and scale changes update a draft layout; visible blocks reflow through CSS Grid. Saving as a new view persists a user view in localStorage and exports portable JSON to `appearance/views/` on user action.

## View JSON schema (v1)

```json
{
  "schemaVersion": 1,
  "id": "bg-stage-slide",
  "name": "BG Stage Slide",
  "description": "16:9 presentation view",
  "aspectRatio": "16:9",
  "layout": { "regionWeights": { "left": 0.82, "main": 1.8, "right": 0.82 } },
  "blocks": [
    { "id": "header", "type": "header_banner", "region": "top", "order": 0, "visible": true, "scale": 1 },
    { "id": "verse", "type": "sanskrit", "region": "main", "order": 1, "visible": true, "scale": 1 }
  ]
}
```

Allowed regions are `top`, `left`, `main`, `right`, and `bottom`. Region weights are bounded numeric values, not CSS or executable code. The view engine calculates tracks only for regions containing visible content, so hidden or missing blocks leave no reserved grid holes. Allowed types are registered semantic blocks: `header_banner`, `artwork`, `sanskrit`, `transliteration`, `shabdartha`, `translation`, `purport`, and `footer_banner`. Validate IDs, enum values, and scale bounds; reject unknown executable fields. Built-in views ship as JSON under `appearance/views/`; local edits never overwrite them.

## Session state

The alpha keeps open tabs, each tab's verse ID and selected view, active tab, sidebar state, and theme locally. Storage is behind a small state interface so a later persistence implementation can replace it without changing the reader or content contracts.
