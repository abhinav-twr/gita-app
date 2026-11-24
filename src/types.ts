export type ContentField = 'sanskrit' | 'transliteration' | 'shabdartha' | 'translation' | 'purport'
export type BlockType = 'header_banner' | 'artwork' | ContentField | 'footer_banner'
export type Region = 'top' | 'left' | 'main' | 'right' | 'bottom'

export interface Verse {
  id: string
  bookId: string
  bookTitle: string
  canto: number | null
  chapter: number
  chapterTitle: string
  chapterSubtitle?: string
  language: string
  source?: string
  footerCredit?: string
  artwork?: string | null
  verseNumber: number
  groupEnd?: number
  speaker?: string | null
  tags: string[]
  content: Partial<Record<ContentField, string>>
  resolvedFrom?: Partial<Record<ContentField, string>>
}

export interface ChapterAsset {
  id: string
  title: string
  chapter: number
  language: string
  verseCount: number
  declaredVerseCount: number | null
  sourcePath: string
  verses: Verse[]
}

export interface ViewBlock {
  id: string
  type: BlockType
  region: Region
  order: number
  visible: boolean
  scale: number
}

export interface ViewDefinition {
  schemaVersion: 1
  id: string
  name: string
  description?: string
  aspectRatio?: '16:9' | 'auto'
  layout?: { regionWeights?: Partial<Record<'left' | 'main' | 'right', number>> }
  blocks: ViewBlock[]
  builtIn?: boolean
}

export interface ReaderTab {
  id: string
  verseId: string
  viewId: string
}
