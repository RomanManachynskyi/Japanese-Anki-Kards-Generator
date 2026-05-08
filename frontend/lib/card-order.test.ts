import { describe, expect, it } from "vitest"
import { reorderCards } from "@/lib/card-order"
import type { Card } from "@/types/card"

const buildCard = (id: string): Card => ({
  id,
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
})

describe("reorderCards", () => {
  it("moves card from source index to destination index", () => {
    const cards = [buildCard("a"), buildCard("b"), buildCard("c")]
    const reordered = reorderCards(cards, 0, 2)
    expect(reordered.map((card) => card.id)).toEqual(["b", "c", "a"])
  })

  it("returns original list when indices are invalid", () => {
    const cards = [buildCard("a"), buildCard("b")]
    const reordered = reorderCards(cards, -1, 1)
    expect(reordered).toBe(cards)
  })
})
