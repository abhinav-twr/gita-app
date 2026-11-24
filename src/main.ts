import './style.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/literata/400.css'
import '@fontsource/literata/500.css'
import '@fontsource/literata/600.css'
import '@fontsource/noto-serif-devanagari/400.css'
import '@fontsource/noto-serif-devanagari/500.css'
import '@fontsource/noto-serif-devanagari/600.css'
import { adjacentVerse, contentAssets, findVerse, firstVerse, parserDiagnostics, verses } from './content/library'
import { builtInViews } from './content/views'
import { escapeHtml, markdownHtml, verseLabel } from './format'
import type { ReaderTab, Region, ViewBlock, ViewDefinition } from './types'

const root = document.querySelector<HTMLDivElement>('#app')!
const themes = ['minimal-dark', 'true-black', 'warm-light'] as const
const safeRegions = ['top', 'left', 'main', 'right', 'bottom'] as const
const safeTypes = ['header_banner', 'artwork', 'sanskrit', 'transliteration', 'shabdartha', 'translation', 'purport', 'footer_banner'] as const
let theme = themes.includes(localStorage.getItem('gita-theme') as typeof themes[number]) ? localStorage.getItem('gita-theme')! : 'minimal-dark'
let sidebarOpen = localStorage.getItem('gita-sidebar') !== 'closed'
let page: 'home' | 'reader' = 'home'
let activeTabId = ''
let editing = false
let customViews = loadCustomViews()
let tabs: ReaderTab[] = []

function validateCustomView(value: unknown): value is ViewDefinition {
  if (!value || typeof value !== 'object') return false
  const view = value as Partial<ViewDefinition>
  if (view.schemaVersion !== 1 || typeof view.id !== 'string' || typeof view.name !== 'string' || !Array.isArray(view.blocks)) return false
  view.blocks = view.blocks.filter((block) => block && typeof block.id === 'string' && safeTypes.includes(block.type) && safeRegions.includes(block.region))
    .map((block) => ({ ...block, visible: block.visible !== false, scale: Math.max(.8, Math.min(1.6, Number(block.scale) || 1)) }))
  const weights = view.layout?.regionWeights
  if (weights) for (const region of ['left', 'main', 'right'] as const) {
    const weight = weights[region]
    if (typeof weight === 'number') weights[region] = Math.max(.5, Math.min(4, weight))
  }
  return view.blocks.length > 0
}

function loadCustomViews(): ViewDefinition[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('gita-custom-views') ?? '[]')
    return Array.isArray(value) ? value.filter(validateCustomView) : []
  } catch { return [] }
}

function allViews(): ViewDefinition[] { return [...builtInViews, ...customViews] }
function viewFor(tab: ReaderTab): ViewDefinition { return allViews().find((view) => view.id === tab.viewId) ?? builtInViews[0] }
function activeTab(): ReaderTab | undefined { return tabs.find((tab) => tab.id === activeTabId) }
function saveSessionBits(): void {
  localStorage.setItem('gita-theme', theme)
  localStorage.setItem('gita-sidebar', sidebarOpen ? 'open' : 'closed')
}

function openTab(verseId: string): void {
  if (!findVerse(verseId)) return
  const id = crypto.randomUUID()
  const defaultView = builtInViews.find((view) => view.id === 'bg-stage-slide') ?? builtInViews[0]
  tabs = [...tabs, { id, verseId, viewId: defaultView?.id ?? '' }]
  activeTabId = id
  page = 'reader'
  render()
}

function openInActiveTab(verseId: string): void {
  if (!findVerse(verseId)) return
  const current = activeTab()
  if (!current) { openTab(verseId); return }
  current.verseId = verseId
  page = 'reader'
  render()
}

function closeActiveTab(): void {
  if (!activeTabId) return
  const index = tabs.findIndex((tab) => tab.id === activeTabId)
  tabs = tabs.filter((tab) => tab.id !== activeTabId)
  activeTabId = tabs[Math.max(0, index - 1)]?.id ?? tabs[0]?.id ?? ''
  if (!activeTabId) page = 'home'
  render()
}

function renderHome(): string {
  const cards = contentAssets.map((asset) => `
    <section class="chapter-section" aria-labelledby="chapter-${escapeHtml(asset.chapter)}">
      <div class="chapter-heading"><div>
        <p class="eyebrow">${escapeHtml(asset.verses[0]?.bookTitle ?? asset.title)} · Chapter ${escapeHtml(asset.chapter)}</p>
        <h2 id="chapter-${escapeHtml(asset.chapter)}">${escapeHtml(asset.title)}</h2>
        <p class="chapter-subtitle">${escapeHtml(asset.verses[0]?.chapterSubtitle ?? '')}</p>
      </div><span class="count-badge">${asset.verseCount} parsed verses</span></div>
      <div class="verse-list">${asset.verses.map((verse) => `
        <button class="verse-row" type="button" data-open-verse="${escapeHtml(verse.id)}" aria-label="Open verse ${escapeHtml(verseLabel(verse.id))}">
          <span class="verse-number">${escapeHtml(verseLabel(verse.id))}</span>
          <span class="verse-preview">
            <span class="preview-sanskrit" lang="sa">${escapeHtml((verse.content.sanskrit ?? '').split('\n')[0]?.slice(0, 96) || 'Sanskrit text not provided')}</span>
            <span class="preview-translation" lang="en">${escapeHtml((verse.content.translation ?? 'Translation not provided').split(/\n/)[0].replace(/[*_]/g, '').slice(0, 145))}</span>
          </span>
          <span class="speaker-chip" lang="sa">${verse.speaker ? escapeHtml(verse.speaker) : 'Open verse'}<span aria-hidden="true">↗</span></span>
        </button>`).join('')}</div>
    </section>`).join('')

  const diagnostics = [
    ...parserDiagnostics,
    ...contentAssets.filter((asset) => asset.declaredVerseCount !== null && asset.declaredVerseCount !== asset.verseCount)
      .map((asset) => `${asset.title}: frontmatter declares ${asset.declaredVerseCount} verses; ${asset.verseCount} were parsed.`),
  ]
  return `<main class="home-content">
    <div class="home-intro"><div class="intro-mark" aria-hidden="true">ॐ</div><div>
      <p class="eyebrow">Your scripture library</p><h1>Read with attention.</h1>
      <p class="intro-copy">A quiet place for the verses, their meaning, and the wisdom between them.</p>
    </div></div>
    ${diagnostics.length ? `<details class="import-notice"><summary>Content notes <span>${diagnostics.length}</span></summary><ul>${diagnostics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>` : ''}
    ${cards || `<section class="empty-state"><p class="eyebrow">No scripture found</p><h2>Add Markdown to <code>content/</code></h2><p>Files appear here when they follow the documented schema.</p></section>`}
    <footer class="home-footer"><span>Gita App</span><span>Local library · ${verses.length} verses ready</span></footer>
  </main>`
}

type VerseValue = NonNullable<ReturnType<typeof findVerse>>
function blockText(type: ViewBlock['type'], verse: VerseValue): { title: string; text: string; lang: string } {
  switch (type) {
    case 'sanskrit': return { title: 'Sanskrit', text: verse.content.sanskrit ?? '', lang: 'sa' }
    case 'transliteration': return { title: 'Transliteration', text: verse.content.transliteration ?? '', lang: 'en' }
    case 'shabdartha': return { title: 'Word for word', text: verse.content.shabdartha ?? '', lang: 'en' }
    case 'translation': return { title: 'Translation', text: verse.content.translation ?? '', lang: 'en' }
    case 'purport': return { title: 'Purport', text: verse.content.purport ?? '', lang: 'en' }
    default: return { title: '', text: '', lang: 'en' }
  }
}

function blockBody(block: ViewBlock, verse: VerseValue): string {
  if (block.type === 'header_banner') return `<div class="banner-content"><span class="banner-kicker">${escapeHtml(verse.bookTitle)}</span><strong>Chapter ${verse.chapter} · ${escapeHtml(verse.chapterTitle)}</strong><span class="banner-verse">${escapeHtml(verseLabel(verse.id))}</span></div>`
  if (block.type === 'footer_banner') return `<div class="footer-banner"><span>${escapeHtml(verse.footerCredit ?? 'Bhagavad Gita As It Is')}</span><span>${escapeHtml(verse.source ?? 'Scripture study')}</span></div>`
  if (block.type === 'artwork') return verse.artwork
    ? `<img class="artwork-image" data-artwork src="${escapeHtml(verse.artwork)}" alt="Artwork for ${escapeHtml(verseLabel(verse.id))}"><div class="artwork-placeholder" data-artwork-placeholder hidden><span>ॐ</span><small>Artwork can be added to this asset</small></div>`
    : `<div class="artwork-placeholder"><span>ॐ</span><small>Artwork can be added to this asset</small></div>`
  const item = blockText(block.type, verse)
  if (!item.text.trim() || /^null$/i.test(item.text.trim())) return ''
  const scriptClass = item.lang === 'sa' ? 'sanskrit-copy' : 'english-copy'
  const referenceId = verse.resolvedFrom?.[block.type as 'translation' | 'purport']
  const sourceLink = referenceId ? `<button type="button" class="source-verse-link" data-open-verse="${escapeHtml(referenceId)}">Text from ${escapeHtml(verseLabel(referenceId))} &#8599;</button>` : ''
  return `<div class="content-block-title">${escapeHtml(item.title)}</div><div class="scripture-copy ${scriptClass}" lang="${item.lang}" style="--block-scale:${block.scale}">${markdownHtml(item.text)}</div>${sourceLink}`
}

function renderBlock(block: ViewBlock, verse: VerseValue): string {
  const hidden = !block.visible
  if (hidden) return ''
  const body = blockBody(block, verse)
  if (!body.trim()) return ''
  const controls = editing ? `<div class="block-editor" aria-label="Edit ${escapeHtml(block.type)} block">
    <button type="button" class="icon-button" data-toggle-block="${escapeHtml(block.id)}" title="${hidden ? 'Show' : 'Hide'} block" aria-label="${hidden ? 'Show' : 'Hide'} ${escapeHtml(block.type)}">${hidden ? '○' : '●'}</button>
    <select data-region-block="${escapeHtml(block.id)}" aria-label="Place ${escapeHtml(block.type)}">${safeRegions.map((region) => `<option value="${region}" ${region === block.region ? 'selected' : ''}>${region}</option>`).join('')}</select>
    <button type="button" class="icon-button" data-move-block="${escapeHtml(block.id)}:-1" aria-label="Move block earlier">↑</button>
    <button type="button" class="icon-button" data-move-block="${escapeHtml(block.id)}:1" aria-label="Move block later">↓</button>
    <label class="scale-control">${block.scale.toFixed(1)}×<input type="range" min="0.8" max="1.6" step="0.1" value="${block.scale}" data-scale-block="${escapeHtml(block.id)}" aria-label="Text scale for ${escapeHtml(block.type)}"></label>
  </div>` : ''
  return `<article class="reader-block block-${block.type}${hidden ? ' is-hidden-block' : ''}" data-block-id="${escapeHtml(block.id)}" style="--block-scale:${block.scale}" ${hidden ? 'aria-hidden="true"' : ''}>
    ${controls}${body}
  </article>`
}

function renderReader(): string {
  const tab = activeTab()
  const verse = findVerse(tab?.verseId ?? '')
  if (!tab || !verse) return `<main class="empty-state reader-empty"><p class="eyebrow">Choose a verse</p><h1>Your reading stage is ready.</h1><button class="primary-button" data-go-home>Browse library</button></main>`
  const view = viewFor(tab)
  const regions = new Map<Region, ViewBlock[]>(safeRegions.map((region) => [region, []]))
  for (const block of [...view.blocks].sort((a, b) => a.order - b.order)) regions.get(block.region)?.push(block)
  const markup = new Map<Region, string>(safeRegions.map((region) => [region, (regions.get(region) ?? []).map((block) => renderBlock(block, verse)).join('')]))
  const regionHtml = (region: Region) => markup.get(region) ?? ''
  const bodyRegions = (['left', 'main', 'right'] as const).filter((region) => Boolean(regionHtml(region).trim()))
  const widthFor: Record<(typeof bodyRegions)[number], number> = { left: .82, main: 1.8, right: .82 }
  const columns = bodyRegions.length ? bodyRegions.map((region) => {
    const weight = view.layout?.regionWeights?.[region] ?? widthFor[region]
    return `minmax(0, ${Math.max(.5, Math.min(4, weight))}fr)`
  }).join(' ') : 'minmax(0, 1fr)'
  const areaRows: string[] = []
  const rowSizes: string[] = []
  if (regionHtml('top').trim()) { areaRows.push(`'${bodyRegions.length ? bodyRegions.map(() => 'top').join(' ') : 'top'}'`); rowSizes.push('auto') }
  if (bodyRegions.length) { areaRows.push(`'${bodyRegions.join(' ')}'`); rowSizes.push('minmax(0, 1fr)') }
  if (regionHtml('bottom').trim()) { areaRows.push(`'${bodyRegions.length ? bodyRegions.map(() => 'bottom').join(' ') : 'bottom'}'`); rowSizes.push('auto') }
  const gridStyle = `--view-columns:${columns};--view-rows:${rowSizes.join(' ')};--view-areas:${areaRows.join(' ')}`
  const hiddenBlocks = view.blocks.filter((block) => !block.visible)

  return `<main class="reader-page ${view.aspectRatio === '16:9' ? 'is-stage' : ''} ${view.id.includes('study') ? 'is-study' : ''} ${view.id.includes('minimal') ? 'is-minimal' : ''}">
    <div class="reader-toolbar"><div class="verse-location"><span class="eyebrow">${escapeHtml(verse.bookTitle)}</span><strong>${escapeHtml(verseLabel(verse.id))}</strong><span class="chapter-caption">${escapeHtml(verse.chapterTitle)}</span></div>
      <div class="toolbar-actions"><label class="select-wrap"><span class="sr-only">Reading view</span><select data-active-view aria-label="Choose reading view">${allViews().map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === view.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
      <button type="button" class="quiet-button ${editing ? 'is-active' : ''}" data-edit-view aria-pressed="${editing}">${editing ? 'Done editing' : 'Edit view'}</button>
      ${editing ? '<button type="button" class="quiet-button" data-save-view>Save as new view</button>' : ''}
      </div>
    </div>
    ${editing ? `<div class="edit-rail"><span>Arrange blocks</span>${view.blocks.map((block) => `<button type="button" class="visibility-pill ${block.visible ? 'is-visible' : ''}" data-toggle-block="${escapeHtml(block.id)}" aria-pressed="${block.visible}">${block.visible ? '●' : '○'} ${escapeHtml(block.type.replaceAll('_',' '))}</button>`).join('')}</div>` : ''}
    <section class="reader-grid" aria-label="${escapeHtml(view.name)}" style="${gridStyle}" data-view-id="${escapeHtml(view.id)}">
      <div class="view-region region-top ${regionHtml('top').trim() ? '' : 'region-empty'}">${regionHtml('top')}</div><div class="view-region region-left ${regionHtml('left').trim() ? '' : 'region-empty'}">${regionHtml('left')}</div>
      <div class="view-region region-main ${regionHtml('main').trim() ? '' : 'region-empty'}">${regionHtml('main')}</div><div class="view-region region-right ${regionHtml('right').trim() ? '' : 'region-empty'}">${regionHtml('right')}</div>
      <div class="view-region region-bottom ${regionHtml('bottom').trim() ? '' : 'region-empty'}">${regionHtml('bottom')}</div>
    </section>
    ${editing && hiddenBlocks.length ? `<div class="hidden-dock" aria-label="Hidden blocks"><span>Hidden</span>${hiddenBlocks.map((block) => `<button type="button" class="visibility-pill" data-toggle-block="${escapeHtml(block.id)}">+ ${escapeHtml(block.type.replaceAll('_',' '))}</button>`).join('')}</div>` : ''}
    <div class="reader-nav"><button class="quiet-button" data-step="-1" ${!adjacentVerse(verse.id,-1) ? 'disabled' : ''}>← Previous verse</button><span>${escapeHtml(verseLabel(verse.id))} <i>of</i> ${verses.filter((item) => item.bookId === verse.bookId && item.chapter === verse.chapter).length}</span><button class="quiet-button" data-step="1" ${!adjacentVerse(verse.id,1) ? 'disabled' : ''}>Next verse →</button></div>
  </main>`
}

function render(): void {
  const tabsHtml = tabs.map((tab, index) => {
    const verse = findVerse(tab.verseId)
    const selected = tab.id === activeTabId && page === 'reader'
    return `<div class="sidebar-tab ${selected ? 'is-active' : ''}" role="presentation">
      <button type="button" class="tab-select" role="tab" aria-selected="${selected}" data-tab="${escapeHtml(tab.id)}"><span class="tab-index">${index + 1}</span><span class="tab-copy"><strong>${escapeHtml(verse ? `BG ${verseLabel(verse.id)}` : 'Shloka')}</strong><small>${escapeHtml(verse?.chapterTitle ?? 'Open reading')}</small></span></button>
      <button type="button" class="tab-close" data-close-tab="${escapeHtml(tab.id)}" aria-label="Close ${escapeHtml(verse?.id ?? 'shloka tab')}">×</button>
    </div>`
  }).join('')
  root.dataset.theme = theme
  root.innerHTML = `<div class="app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}">
    <aside class="sidebar" aria-label="Library and open verses">
      <div class="sidebar-brand"><span class="brand-mark" lang="sa">ॐ</span><span><strong>Gita App</strong><small>Scripture, in focus</small></span></div>
      <button type="button" class="home-link ${page === 'home' ? 'is-active' : ''}" data-go-home><span>⌂</span><span>Home</span><kbd>Ctrl H</kbd></button>
      <div class="sidebar-section-heading"><span>OPEN VERSES</span><button type="button" class="icon-button add-tab" data-new-tab aria-label="Open a new shloka tab" title="Open a shloka tab">+</button></div>
      <div class="sidebar-tabs" role="tablist" aria-label="Open shloka tabs">${tabsHtml || '<p class="empty-tabs">Pick a verse from your library to open it here.</p>'}</div>
      <div class="sidebar-bottom"><span class="online-dot"></span><span>Available offline</span></div>
    </aside>
    <div class="main-shell"><header class="app-topline"><div class="topline-context"><button type="button" class="icon-button persistent-sidebar-toggle" data-sidebar-toggle aria-expanded="${sidebarOpen}" aria-label="${sidebarOpen ? 'Collapse' : 'Expand'} sidebar" title="${sidebarOpen ? 'Collapse' : 'Expand'} sidebar (Ctrl+\\)"><span aria-hidden="true">${sidebarOpen ? '&#x276E;' : '&#x276F;'}</span></button><span class="topline-dot"></span>${page === 'home' ? 'Scripture library' : 'Reading stage'}</div><div class="topline-right"><span class="local-status"><span></span>Local library</span><label class="select-wrap global-theme"><span class="sr-only">Color theme</span><select data-theme aria-label="Color theme">${[['minimal-dark','Minimal Dark'],['true-black','True Black'],['warm-light','Warm Light']].map(([id,name]) => `<option value="${id}" ${theme === id ? 'selected' : ''}>${name}</option>`).join('')}</select></label></div></header>
      ${page === 'home' ? renderHome() : renderReader()}
    </div>
  </div>`
  bindEvents()
  root.querySelectorAll<HTMLImageElement>('[data-artwork]').forEach((image) => image.addEventListener('error', () => {
    image.hidden = true
    image.nextElementSibling?.removeAttribute('hidden')
  }, { once: true }))
}

function updateActiveView(viewId: string): void {
  const tab = activeTab()
  if (tab && allViews().some((view) => view.id === viewId)) tab.viewId = viewId
  editing = false
  render()
}

function mutateActiveView(mutator: (view: ViewDefinition) => void): void {
  const tab = activeTab()
  if (!tab) return
  const view = structuredClone(viewFor(tab))
  if (builtInViews.some((item) => item.id === view.id)) {
    view.id = `draft-${view.id}`
    view.name = `${view.name} · edited`
    view.builtIn = false
  }
  mutator(view)
  customViews = [...customViews.filter((item) => item.id !== view.id), view]
  tab.viewId = view.id
  render()
}

function bindEvents(): void {
  root.querySelectorAll<HTMLElement>('[data-go-home]').forEach((el) => el.addEventListener('click', () => { page = 'home'; editing = false; render() }))
  root.querySelectorAll<HTMLElement>('[data-new-tab]').forEach((el) => el.addEventListener('click', () => openTab(activeTab()?.verseId ?? firstVerse?.id ?? '')))
  root.querySelectorAll<HTMLElement>('[data-sidebar-toggle]').forEach((el) => el.addEventListener('click', () => { sidebarOpen = !sidebarOpen; saveSessionBits(); render() }))
  root.querySelectorAll<HTMLElement>('[data-open-verse]').forEach((el) => {
    el.addEventListener('click', () => openInActiveTab(el.dataset.openVerse ?? ''))
    el.addEventListener('auxclick', (event) => { if (event.button === 1) { event.preventDefault(); openTab(el.dataset.openVerse ?? '') } })
  })
  root.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => el.addEventListener('click', () => {
    const tab = tabs.find((item) => item.id === el.dataset.tab)
    if (tab) { activeTabId = tab.id; page = 'reader'; render() }
  }))
  root.querySelectorAll<HTMLElement>('[data-close-tab]').forEach((el) => el.addEventListener('click', (event) => {
    event.stopPropagation()
    const id = el.dataset.closeTab
    const index = tabs.findIndex((tab) => tab.id === id)
    tabs = tabs.filter((tab) => tab.id !== id)
    if (id === activeTabId) activeTabId = tabs[Math.max(0,index - 1)]?.id ?? tabs[0]?.id ?? ''
    if (!activeTabId) page = 'home'
    render()
  }))
  root.querySelector<HTMLSelectElement>('[data-active-view]')?.addEventListener('change', (event) => updateActiveView((event.currentTarget as HTMLSelectElement).value))
  root.querySelector<HTMLSelectElement>('[data-theme]')?.addEventListener('change', (event) => { theme = (event.currentTarget as HTMLSelectElement).value; saveSessionBits(); render() })
  root.querySelector<HTMLElement>('[data-edit-view]')?.addEventListener('click', () => { editing = !editing; render() })
  root.querySelector<HTMLElement>('[data-save-view]')?.addEventListener('click', saveViewAsNew)
  root.querySelectorAll<HTMLElement>('[data-toggle-block]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.toggleBlock
    if (id) mutateActiveView((view) => { const block = view.blocks.find((item) => item.id === id); if (block) block.visible = !block.visible })
  }))
  root.querySelectorAll<HTMLSelectElement>('[data-region-block]').forEach((el) => el.addEventListener('change', () => {
    const id = el.dataset.regionBlock
    const region = el.value as Region
    mutateActiveView((view) => { const block = view.blocks.find((item) => item.id === id); if (block) block.region = region })
  }))
  root.querySelectorAll<HTMLElement>('[data-move-block]').forEach((el) => el.addEventListener('click', () => {
    const [id, delta] = (el.dataset.moveBlock ?? '').split(':')
    mutateActiveView((view) => {
      const block = view.blocks.find((item) => item.id === id)
      if (!block) return
      const peers = view.blocks.filter((item) => item.region === block.region).sort((a,b) => a.order-b.order)
      const index = peers.findIndex((item) => item.id === id)
      const other = peers[index + Number(delta)]
      if (other) { const previous = block.order; block.order = other.order; other.order = previous }
    })
  }))
  root.querySelectorAll<HTMLInputElement>('[data-scale-block]').forEach((el) => el.addEventListener('change', () => {
    const id = el.dataset.scaleBlock
    const scale = Number(el.value)
    if (id) mutateActiveView((view) => { const block = view.blocks.find((item) => item.id === id); if (block) block.scale = scale })
  }))
  root.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => el.addEventListener('click', () => {
    const tab = activeTab()
    const next = tab && adjacentVerse(tab.verseId, Number(el.dataset.step) as -1 | 1)
    if (tab && next) { tab.verseId = next.id; render() }
  }))
}

function saveViewAsNew(): void {
  const tab = activeTab()
  if (!tab) return
  const name = window.prompt('Name this view', `${viewFor(tab).name.replace(' · edited', '')} copy`)
  if (!name?.trim()) return
  const view = structuredClone(viewFor(tab))
  view.id = `custom-${crypto.randomUUID()}`
  view.name = name.trim()
  view.builtIn = false
  customViews = [...customViews.filter((item) => !item.id.startsWith('draft-')), view]
  localStorage.setItem('gita-custom-views', JSON.stringify(customViews))
  tab.viewId = view.id
  const link = document.createElement('a')
  const downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(view, null, 2)], { type: 'application/json' }))
  link.href = downloadUrl
  link.download = `${view.id}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
  render()
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))
}

document.addEventListener('keydown', (event) => {
  if (isTypingTarget(event.target)) return
  if (event.ctrlKey && event.key.toLowerCase() === 'h') { event.preventDefault(); page = 'home'; editing = false; render(); return }
  if (event.ctrlKey && event.key.toLowerCase() === 'w') { event.preventDefault(); closeActiveTab(); return }
  if (event.ctrlKey && (event.key === '\\' || event.key === '|')) { event.preventDefault(); sidebarOpen = !sidebarOpen; saveSessionBits(); render(); return }
  if (event.ctrlKey && event.shiftKey && /^Digit[1-3]$/.test(event.code)) {
    const tab = activeTab()
    const presets = ['bg-stage-slide', 'bg-full-study', 'bg-minimal-verse']
    const viewId = presets[Number(event.code.slice(-1)) - 1]
    if (tab && builtInViews.some((view) => view.id === viewId)) { event.preventDefault(); tab.viewId = viewId; editing = false; render() }
    return
  }
  if (event.ctrlKey && /^[1-9]$/.test(event.key)) {
    const tab = tabs[Number(event.key) - 1]
    if (tab) { event.preventDefault(); activeTabId = tab.id; page = 'reader'; render() }
    return
  }
  if (!event.ctrlKey && !event.altKey && !event.metaKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && page === 'reader') {
    const tab = activeTab()
    const next = tab && adjacentVerse(tab.verseId, event.key === 'ArrowLeft' ? -1 : 1)
    if (tab && next) { event.preventDefault(); tab.verseId = next.id; render() }
  }
})

if (!contentAssets.length) {
  root.innerHTML = `<main class="fatal-state"><h1>No content assets could be parsed.</h1><p>Add a Markdown asset that follows <code>ARCHITECTURE.md</code>.</p><ul>${parserDiagnostics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></main>`
} else render()
