import type { Card, CardDraft } from "@/types/card"
import type { CardInput } from "@/lib/api"
import { containsKanji, deriveKanaFromFurigana, getJapaneseWord } from "@/lib/card-utils"

const DEFAULT_GENERATION_MODE: CardDraft["generationMode"] = "both"
const DEFAULT_AUDIO_COUNT = 1

export const createEmptyCardDraft = (): CardDraft => ({
  reading: "",
  kanji: "",
  furigana: "",
  translation: "",
  sentenceKana: "",
  sentenceEnglish: "",
  sentenceImage: "",
  audioCount: DEFAULT_AUDIO_COUNT,
  generationMode: DEFAULT_GENERATION_MODE,
  notes: "",
})

export const createCardId = (): string => Date.now().toString()

export const createNewCard = (): Card => ({
  id: createCardId(),
  ...createEmptyCardDraft(),
  createdAt: Date.now(),
})

export const hasCardContent = (card: Card): boolean => {
  return Boolean(getJapaneseWord(card) || card.translation.trim())
}

export const toApiCardInput = (card: Card): CardInput => {
  const japaneseWord = getJapaneseWord(card)
  const hasKanji = containsKanji(japaneseWord)
  return {
    reading: hasKanji ? deriveKanaFromFurigana(card.furigana) : japaneseWord,
    kanji: hasKanji
      ? {
          kanji: japaneseWord,
          furigana: card.furigana || "",
        }
      : null,
    translation: card.translation,
    sentence_kana: card.sentenceKana || "",
    sentence_english: card.sentenceEnglish || "",
    sentence_image: card.sentenceImage || "",
    audio_count: card.audioCount > 0 ? card.audioCount : null,
    generation_mode: card.generationMode || DEFAULT_GENERATION_MODE,
    notes: card.notes || "",
  }
}
