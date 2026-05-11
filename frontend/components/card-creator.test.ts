import { describe, expect, it } from "vitest"
import { sanitizeAudioCount } from "@/components/card-creator"

describe("sanitizeAudioCount", () => {
  it("returns zero when input is not a number", () => {
    expect(sanitizeAudioCount("")).toBe(0)
    expect(sanitizeAudioCount("abc")).toBe(0)
  })

  it("clamps values to supported audio range", () => {
    expect(sanitizeAudioCount("-5")).toBe(0)
    expect(sanitizeAudioCount("3")).toBe(3)
    expect(sanitizeAudioCount("20")).toBe(10)
  })
})
