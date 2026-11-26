// Convierte el Markdown sencillo que devuelve la IA (negritas, cursivas, listas, párrafos)
// en bloques que Vue pinta con elementos normales. No se usa v-html: el texto nunca se
// interpreta como HTML, así que una respuesta no puede inyectar código en la página.

function inline(text) {
  const parts = []
  const pattern = /\*\*(.+?)\*\*|__(.+?)__|\*(?!\s)(.+?)\*|_(?!\s)(.+?)_/g
  let last = 0, match
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    if (match[1] ?? match[2]) parts.push({ text: match[1] ?? match[2], bold: true })
    else parts.push({ text: match[3] ?? match[4], italic: true })
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts.length ? parts : [{ text }]
}

export function formatChat(text) {
  const blocks = []
  let list = null
  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^[*\-•]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (!list || list.type !== type) { list = { type, items: [] }; blocks.push(list) }
      list.items.push(inline((bullet || numbered)[1]))
      continue
    }
    list = null
    if (!line) continue
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    blocks.push({ type: 'p', parts: heading ? [{ text: heading[1], bold: true }] : inline(line) })
  }
  return blocks
}
