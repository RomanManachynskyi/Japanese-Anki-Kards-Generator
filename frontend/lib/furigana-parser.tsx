import type React from "react"

/**
 * Parse furigana format: 漢字[ふりがな]漢字[ふりがな]
 * Returns array of { kanji, furigana } objects
 */
export function parseFurigana(text: string): Array<{ kanji: string; furigana: string }> {
  const result = []
  const regex = /([^[\]]+)\[([^\]]+)\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    result.push({
      kanji: match[1],
      furigana: match[2],
    })
  }

  return result
}

/**
 * Convert furigana to ruby HTML format
 */
export function furiganaToRuby(text: string): React.ReactNode {
  const parsed = parseFurigana(text)

  if (parsed.length === 0) {
    return text
  }

  return parsed.map((item, idx) => (
    <ruby key={idx}>
      {item.kanji}
      <rt>{item.furigana}</rt>
    </ruby>
  ))
}
