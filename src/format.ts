import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })
const allowedTags = ['p', 'br', 'em', 'strong', 'del', 'code', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'a']

export function markdownHtml(source: string): string {
  if (!source.trim()) return ''
  return DOMPurify.sanitize(marked.parse(source) as string, {
    ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: ['href', 'title'], ALLOW_DATA_ATTR: false,
  })
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

export function verseLabel(verseId: string): string {
  const match = verseId.match(/:(?:\d+\.)?(\d+)\.(\d+)$/)
  return match ? `${match[1]}.${match[2]}` : verseId
}
