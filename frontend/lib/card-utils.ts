import type { Card } from "@/types/card"

export type CompletionReason =
  | "missing_japanese_word"
  | "missing_translation"
  | "incomplete_furigana"
  | "invalid_path_characters"

export interface CardCompletionState {
  isComplete: boolean
  reasons: CompletionReason[]
}

// Characters that can break path/file handling on common operating systems.
export const FORBIDDEN_PATH_CHARACTERS = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'] as const

export const getForbiddenPathCharacters = (text: string): string[] => {
  const found = new Set<string>()
  for (const char of text) {
    if (FORBIDDEN_PATH_CHARACTERS.includes(char as (typeof FORBIDDEN_PATH_CHARACTERS)[number])) {
      found.add(char)
    }
  }
  return Array.from(found)
}

export const hasForbiddenPathCharacters = (text: string): boolean => {
  return getForbiddenPathCharacters(text).length > 0
}

export const containsKanji = (text: string): boolean => {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0x2a700 && code <= 0x2b73f) ||
      (code >= 0x2b740 && code <= 0x2b81f) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      // Ideographic iteration mark (e.g. 色々) should behave like kanji.
      code === 0x3005
    ) {
      return true
    }
  }
  return false
}

const isKanji = (char: string): boolean => containsKanji(char)

const isHiragana = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code >= 0x3040 && code <= 0x309f
}

export const getJapaneseWord = (card: Pick<Card, "reading" | "kanji">): string => {
  return (card.kanji || card.reading || "").trim()
}

export const generateFuriganaTemplate = (text: string): string => {
  if (!text) return ""

  let result = ""
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (isKanji(char)) {
      result += `${char}[]`
      if (nextChar && !isHiragana(nextChar)) {
        result += " "
      }
    } else {
      result += char
    }
  }
  return result
}

export const isFuriganaComplete = (furiganaText: string): boolean => {
  const templateMatches = furiganaText.match(/\[[^\]]*\]/g)
  if (!templateMatches || templateMatches.length === 0) {
    return false
  }
  return templateMatches.every((match) => match.slice(1, -1).trim().length > 0)
}

export const deriveKanaFromFurigana = (furiganaText: string): string => {
  const pattern = /([^[\]\s]+)\[([^\]]*)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let result = ""

  while ((match = pattern.exec(furiganaText)) !== null) {
    const prefix = furiganaText.slice(lastIndex, match.index)
    result += prefix.replace(/\s+/g, "")
    result += match[2].trim()
    lastIndex = pattern.lastIndex
  }

  result += furiganaText.slice(lastIndex).replace(/\s+/g, "")
  return result
}

export const getCardCompletionState = (
  card: Pick<Card, "reading" | "kanji" | "furigana" | "translation" | "sentenceKana">,
): CardCompletionState => {
  const reasons: CompletionReason[] = []
  const japaneseWord = getJapaneseWord(card)

  if (!japaneseWord) {
    reasons.push("missing_japanese_word")
  }
  if (!card.translation.trim()) {
    reasons.push("missing_translation")
  }
  if (japaneseWord && containsKanji(japaneseWord) && !isFuriganaComplete(card.furigana)) {
    reasons.push("incomplete_furigana")
  }
  if (
    hasForbiddenPathCharacters(japaneseWord) ||
    hasForbiddenPathCharacters(card.furigana) ||
    hasForbiddenPathCharacters(card.sentenceKana || "")
  ) {
    reasons.push("invalid_path_characters")
  }

  return {
    isComplete: reasons.length === 0,
    reasons,
  }
}

export const normalizeCardFromJapaneseInput = (card: Card): Card => {
  const japaneseWord = getJapaneseWord(card)
  if (!japaneseWord) {
    return { ...card, reading: "", kanji: "", furigana: "" }
  }

  if (containsKanji(japaneseWord)) {
    return {
      ...card,
      kanji: japaneseWord,
      reading: "",
      furigana: card.furigana || generateFuriganaTemplate(japaneseWord),
    }
  }

  return {
    ...card,
    reading: japaneseWord,
    kanji: "",
    furigana: "",
  }
}
