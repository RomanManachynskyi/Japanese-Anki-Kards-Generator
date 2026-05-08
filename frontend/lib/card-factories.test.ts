import { describe, expect, it } from "vitest"
import { hasCardContent, toApiCardInput } from "@/lib/card-factories"
import type { Card } from "@/types/card"

const baseCard: Card = {
  id: "1",
  reading: "",
  kanji: "",
  furigana: "",
  translation: "",
  sentenceKana: "",
  sentenceEnglish: "",
  sentenceImage: "",
  audioCount: 1,
  generationMode: "both",
  notes: "",
  createdAt: 0,
}

describe("card-factories", () => {
  it("checks if card has content", () => {
    expect(hasCardContent(baseCard)).toBe(false)
    expect(hasCardContent({ ...baseCard, translation: "cold" })).toBe(true)
  })

  it("maps kanji card to API input", () => {
    const apiCard = toApiCardInput({
      ...baseCard,
      kanji: "冷たい",
      furigana: "冷[つめ]たい",
      translation: "cold",
    })

    expect(apiCard.reading).toBe("つめたい")
    expect(apiCard.kanji).toEqual({ kanji: "冷たい", furigana: "冷[つめ]たい" })
  })
})
