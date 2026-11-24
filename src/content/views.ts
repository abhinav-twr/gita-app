import type { ViewDefinition } from '../types'

const imported = import.meta.glob<unknown>('../../appearance/views/*.json', { eager: true, import: 'default' })
const safeRegions = new Set(['top', 'left', 'main', 'right', 'bottom'])
const safeTypes = new Set(['header_banner', 'artwork', 'sanskrit', 'transliteration', 'shabdartha', 'translation', 'purport', 'footer_banner'])

function validateView(value: unknown): ViewDefinition | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (candidate.schemaVersion !== 1 || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.blocks)) return null
  const blocks = candidate.blocks.filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === 'object')
    .filter((block) => typeof block.id === 'string' && safeTypes.has(String(block.type)) && safeRegions.has(String(block.region)))
    .map((block) => ({
      id: String(block.id), type: block.type as ViewDefinition['blocks'][number]['type'],
      region: block.region as ViewDefinition['blocks'][number]['region'],
      order: Number.isFinite(Number(block.order)) ? Number(block.order) : 0,
      visible: block.visible !== false, scale: Math.min(1.6, Math.max(0.8, Number(block.scale) || 1)),
    }))
  if (!blocks.length) return null
  const rawLayout = candidate.layout && typeof candidate.layout === 'object' ? candidate.layout as Record<string, unknown> : {}
  const rawWeights = rawLayout.regionWeights && typeof rawLayout.regionWeights === 'object' ? rawLayout.regionWeights as Record<string, unknown> : {}
  const regionWeights: Partial<Record<'left' | 'main' | 'right', number>> = {}
  for (const region of ['left', 'main', 'right'] as const) {
    const weight = Number(rawWeights[region])
    if (Number.isFinite(weight)) regionWeights[region] = Math.max(.5, Math.min(4, weight))
  }
  return {
    schemaVersion: 1, id: candidate.id, name: candidate.name,
    description: typeof candidate.description === 'string' ? candidate.description : '',
    aspectRatio: candidate.aspectRatio === '16:9' ? '16:9' : 'auto',
    layout: { regionWeights }, blocks, builtIn: true,
  }
}

export const builtInViews: ViewDefinition[] = Object.values(imported).map(validateView)
  .filter((view): view is ViewDefinition => view !== null).sort((a, b) => a.name.localeCompare(b.name))
