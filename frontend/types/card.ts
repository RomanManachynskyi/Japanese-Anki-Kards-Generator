export type CardGenerationMode = "both" | "jp_en" | "en_jp"

export interface Card {
  id: string
  reading: string
  kanji: string
  furigana: string
  translation: string
  sentenceKana: string
  sentenceEnglish: string
  sentenceImage: string // Base64 image data URL
  audioCount: number
  generationMode: CardGenerationMode // Which card variants to generate
  createdAt: number
}
