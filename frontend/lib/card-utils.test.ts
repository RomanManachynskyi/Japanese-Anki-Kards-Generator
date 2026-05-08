import { describe, expect, it } from "vitest"
import {
  containsKanji,
  deriveKanaFromFurigana,
  generateFuriganaTemplate,
  getCardCompletionState,
  getForbiddenPathCharacters,
  isFuriganaComplete,
} from "@/lib/card-utils"

describe("card-utils", () => {
  it("detects kanji and iteration mark as kanji", () => {
    expect(containsKanji("色々")).toBe(true)
    expect(containsKanji("ビジネス")).toBe(false)
  })

  it("generates furigana templates for kanji words", () => {
    expect(generateFuriganaTemplate("冷たい")).toBe("冷[]たい")
    expect(generateFuriganaTemplate("色々")).toBe("色[] 々[]")
  })

  it("validates furigana bracket completion", () => {
    expect(isFuriganaComplete("冷[つめ]たい")).toBe(true)
    expect(isFuriganaComplete("冷[]たい")).toBe(false)
    expect(isFuriganaComplete("")).toBe(false)
  })

  it("derives kana from furigana by removing spaces and kanji", () => {
    expect(deriveKanaFromFurigana("色[いろ] 々[いろ]")).toBe("いろいろ")
  })

  it("reports forbidden path characters in input", () => {
    expect(getForbiddenPathCharacters('a:b?c*')).toEqual([":", "?", "*"])
  })

  it("returns completion reasons for missing and invalid card fields", () => {
    const state = getCardCompletionState({
      reading: "",
      kanji: "冷たい",
      furigana: "冷[]たい",
      translation: "",
      sentenceKana: "郵便局:に行きます",
    })

    expect(state.isComplete).toBe(false)
    expect(state.reasons).toContain("missing_translation")
    expect(state.reasons).toContain("incomplete_furigana")
    expect(state.reasons).toContain("invalid_path_characters")
  })
})
