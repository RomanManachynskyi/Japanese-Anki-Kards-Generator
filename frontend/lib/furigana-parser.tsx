import type React from "react"

type FuriganaPart =
  | { type: "ruby"; kanji: string; furigana: string }
  | { type: "text"; value: string }

/**
 * Parse furigana format with support for mixed plain text segments.
 * Example: 色[いろ] 々[いろ]あって
 */
export function parseFurigana(text: string): FuriganaPart[] {
  const result: FuriganaPart[] = []
  const regex = /([^[\]\s]+)\[([^\]]+)\]/g
  let match
  let lastIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index)
      if (plainText) {
        result.push({ type: "text", value: plainText })
      }
    }
    result.push({
      type: "ruby",
      kanji: match[1],
      furigana: match[2],
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", value: text.slice(lastIndex) })
  }

  return result
}

/**
 * Convert furigana to ruby HTML format
 */
export function furiganaToRuby(text: string): React.ReactNode {
  const parsed = parseFurigana(text)

  if (parsed.length === 0 || parsed.every((part) => part.type === "text")) {
    return text
  }

  return parsed.map((item, idx) => {
    if (item.type === "text") {
      return <span key={idx}>{item.value}</span>
    }
    return (
      <ruby key={idx}>
        {item.kanji}
        <rt>{item.furigana}</rt>
      </ruby>
    )
  })
}
