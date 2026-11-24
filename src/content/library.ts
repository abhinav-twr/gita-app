import { parse as parseYaml } from 'yaml'
import type { ChapterAsset, ContentField, Verse } from '../types'

const markdownFiles = import.meta.glob<string>('../../content/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

interface Frontmatter extends Record<string, unknown> {
  book_id?: string
  book_title?: string
  canto?: number | null
  chapter?: number
  chapter_title?: string
  chapter_subtitle?: string
  language?: string
  source?: string
  default_artwork?: string | null
  footer_credit?: string
  verse_count?: number
}

const fields: ContentField[] = ['sanskrit', 'transliteration', 'shabdartha', 'translation', 'purport']
const sectionHeading = /^###\s+(metadata|sanskrit|transliteration|shabdartha|translation|purport)\s*$/gim
const verseHeading = /^##\s+Verse\s+(\d+)(?:\s*[-–]\s*(\d+))?\s*$/gim

function splitFrontmatter(raw: string): { metadata: Frontmatter; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\s*(?:\n|$)/)
  if (!match) throw new Error('Missing YAML frontmatter')
  const metadata = parseYaml(match[1]) as Frontmatter
  if (!metadata || typeof metadata !== 'object') throw new Error('Frontmatter must be a YAML mapping')
  return { metadata, body: normalized.slice(match[0].length) }
}

function sectionsForVerse(source: string): Map<string, string> {
  const matches = [...source.matchAll(sectionHeading)]
  const sections = new Map<string, string>()
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? source.length
    sections.set(match[1].toLowerCase(), source.slice(start, end).trim())
  }
  return sections
}

function parseVerseMetadata(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const data = parseYaml(raw)
    return data && typeof data === 'object' ? data as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function isEmpty(value: unknown): boolean {
  return value == null || (typeof value === 'string' && (!value.trim() || /^null$/i.test(value.trim())))
}

function cleanOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string' || isEmpty(value)) return undefined
  const text = value.trim()
  if (/^\?+$/.test(text)) return undefined
  return text
}

function parseAsset(path: string, raw: string): ChapterAsset {
  const { metadata, body } = splitFrontmatter(raw)
  const bookId = String(metadata.book_id ?? '').trim()
  const chapter = Number(metadata.chapter)
  if (!bookId || !Number.isFinite(chapter)) throw new Error(`Missing book_id or chapter in ${path}`)
  const chapterTitle = String(metadata.chapter_title ?? `Chapter ${chapter}`)
  const language = String(metadata.language ?? 'en').toLowerCase()
  const headings = [...body.matchAll(verseHeading)]
  const verses: Verse[] = []

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]
    const first = Number(heading[1])
    const last = Number(heading[2] ?? heading[1])
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? body.length
    const parts = sectionsForVerse(body.slice(start, end))
    const verseMeta = parseVerseMetadata(parts.get('metadata') ?? '')
    const values: Partial<Record<ContentField, string>> = {}
    for (const field of fields) {
      const value = parts.get(field)
      if (!isEmpty(value)) values[field] = value!.trim()
    }
    const tags = Array.isArray(verseMeta.tags) ? verseMeta.tags.map(String) : []

    for (let verseNumber = first; verseNumber <= last; verseNumber += 1) {
      const canto = typeof metadata.canto === 'number' ? metadata.canto : null
      const id = `${bookId}:${canto ? `${canto}.` : ''}${chapter}.${verseNumber}`
      verses.push({
        id, bookId, bookTitle: String(metadata.book_title ?? bookId), canto, chapter, chapterTitle,
        chapterSubtitle: cleanOptionalText(metadata.chapter_subtitle), language,
        source: cleanOptionalText(metadata.source),
        footerCredit: cleanOptionalText(metadata.footer_credit),
        artwork: cleanOptionalText(verseMeta.artwork) ?? cleanOptionalText(metadata.default_artwork) ?? null,
        verseNumber, ...(last > first ? { groupEnd: last } : {}),
        speaker: cleanOptionalText(verseMeta.speaker), tags, content: { ...values },
      })
    }
  }

  return {
    id: `${bookId}:${chapter}:${language}`, title: chapterTitle, chapter, language,
    verseCount: verses.length,
    declaredVerseCount: Number.isFinite(Number(metadata.verse_count)) ? Number(metadata.verse_count) : null,
    sourcePath: path.replace(/^\.\.\//, ''), verses,
  }
}

function resolveCrossReferences(verses: Verse[]): void {
  const byNumber = new Map(verses.map((verse) => [verse.verseNumber, verse]))
  for (const verse of verses) {
    for (const field of ['translation', 'purport'] as const) {
      const match = verse.content[field]?.trim().match(/^(?:with|mixed with)\s+(\d+)$/i)
      if (!match) continue
      const referenced = byNumber.get(Number(match[1]))
      const replacement = referenced?.content[field]
      if (referenced && referenced.id !== verse.id && replacement && !/^(?:with|mixed with)\s+\d+$/i.test(replacement.trim())) {
        verse.content[field] = replacement
        verse.resolvedFrom ??= {}
        verse.resolvedFrom[field] = referenced.id
      } else {
        verse.content[field] = `Cross-reference to verse ${match[1]} is not available in this asset.`
      }
    }
  }
}

const diagnostics: string[] = []
const assets: ChapterAsset[] = []
for (const [path, raw] of Object.entries(markdownFiles).sort(([a], [b]) => a.localeCompare(b))) {
  try { assets.push(parseAsset(path, raw)) }
  catch (error) { diagnostics.push(`${path}: ${error instanceof Error ? error.message : 'Could not parse file'}`) }
}

for (const asset of assets) resolveCrossReferences(asset.verses)
const allVerses = assets.flatMap((asset) => asset.verses)
export const contentAssets = assets
export const verses = allVerses.sort((a, b) => a.bookId.localeCompare(b.bookId) || (a.canto ?? 0) - (b.canto ?? 0) || a.chapter - b.chapter || a.verseNumber - b.verseNumber)
export const parserDiagnostics = diagnostics
export const firstVerse = verses[0]
export function findVerse(id: string): Verse | undefined { return verses.find((verse) => verse.id.toLowerCase() === id.trim().toLowerCase()) }
export function adjacentVerse(id: string, direction: -1 | 1): Verse | undefined {
  const index = verses.findIndex((verse) => verse.id === id)
  return index < 0 ? undefined : verses[index + direction]
}
