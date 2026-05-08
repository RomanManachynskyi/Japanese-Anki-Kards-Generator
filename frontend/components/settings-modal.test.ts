import { describe, expect, it } from "vitest"
import { parseStoredAudioConfig } from "@/components/settings-modal"

describe("parseStoredAudioConfig", () => {
  it("parses valid stored config", () => {
    const parsed = parseStoredAudioConfig(
      JSON.stringify({
        apiKey: "key",
        voiceId: "voice",
        modelId: "model",
      }),
    )

    expect(parsed).toEqual({
      apiKey: "key",
      voiceId: "voice",
      modelId: "model",
    })
  })

  it("returns null for invalid JSON", () => {
    expect(parseStoredAudioConfig("{bad-json")).toBeNull()
  })
})
