"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2 } from "lucide-react"
import { furiganaToRuby } from "@/lib/furigana-parser"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { CardGenerationMode } from "@/types/card"

interface CardPreviewProps {
  cardData: {
    reading: string
    kanji: string
    furigana: string
    translation: string
    sentenceKana: string
    sentenceEnglish: string
    sentenceImage: string
    audioCount: number
    generationMode: CardGenerationMode
  }
  setCardData?: (data: any) => void
}

export default function CardPreview({ cardData, setCardData }: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleInputChange = (field: string, value: string | number) => {
    if (setCardData) {
      setCardData({
        ...cardData,
        [field]: value,
      })
    }
  }

  const isEmpty = !cardData.reading && !cardData.kanji && !cardData.translation && !cardData.sentenceKana

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground">Preview</CardTitle>
          <p className="text-xs text-muted-foreground">{isFlipped ? "Back of card" : "Front of card"}</p>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="flex h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
              <p className="text-sm text-muted-foreground">Fill in the form to preview your card</p>
            </div>
          ) : (
            <div
              className="relative h-96 rounded-lg border-2 border-border bg-background cursor-pointer overflow-hidden flex flex-col items-center justify-between p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Side - Shows Kanji (or Kana if no Kanji) - No Audio */}
              {!isFlipped && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                  {/* Large Kanji or Kana - no furigana on front */}
                  <div className="text-center">
                    {cardData.kanji ? (
                      <p className="text-6xl font-bold text-foreground">{cardData.kanji}</p>
                    ) : (
                      <p className="text-7xl font-bold text-foreground">{cardData.reading}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Back Side */}
              {isFlipped && (
                <div className="w-full h-full flex flex-col items-center justify-between">
                  {/* Top - kanji smaller */}
                  <div className="text-center pt-8">
                    {cardData.kanji && <p className="text-4xl font-bold text-foreground">{cardData.kanji}</p>}
                  </div>

                  {/* Middle - main content */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    {/* Translation */}
                    {cardData.translation && (
                      <p className="text-2xl font-semibold text-foreground">{cardData.translation}</p>
                    )}

                    {/* Furigana */}
                    {cardData.furigana && (
                      <p className="text-lg text-muted-foreground [&_ruby]:text-base">
                        {furiganaToRuby(cardData.furigana)}
                      </p>
                    )}

                    {/* Vocabulary Audio */}
                    {cardData.audioCount > 0 && (
                      <div className="flex gap-2 flex-wrap justify-center">
                        {Array.from({ length: cardData.audioCount }).map((_, i) => (
                          <button
                            key={i}
                            className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary bg-primary/10 hover:bg-primary/20 hover:scale-110 hover:shadow-md transition-all"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <Volume2 className="h-5 w-5 text-primary" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Example sentence in kana */}
                    {cardData.sentenceKana && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <p className="text-base text-muted-foreground leading-relaxed">{cardData.sentenceKana}</p>
                          {/* Sentence Audio - separate icon if sentence exists and audio count > 0 */}
                          {cardData.audioCount > 0 && (
                            <button
                              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary bg-primary/10 hover:bg-primary/20 hover:scale-110 hover:shadow-md transition-all flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                              title="Sentence audio"
                            >
                              <Volume2 className="h-4 w-4 text-primary" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sentence Image */}
                    {cardData.sentenceImage && (
                      <div className="text-center">
                        <img
                          src={cardData.sentenceImage}
                          alt="Sentence"
                          className="max-w-full h-auto rounded border border-border/50"
                          style={{ maxHeight: "200px" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom - English translation (separate row) */}
                  {cardData.sentenceEnglish && (
                    <div className="text-center pb-8 border-t border-border/50 pt-4 w-full">
                      <p className="text-base text-foreground leading-relaxed">{cardData.sentenceEnglish}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Subtle hint */}
              <div className="absolute top-2 right-2 text-xs text-muted-foreground opacity-50">
                {isFlipped ? "← Back" : "Front →"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Generation Mode */}
      {setCardData && (
        <Card className="border-border bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground">Card Generation Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={cardData.generationMode}
              onValueChange={(value) => handleInputChange("generationMode", value as CardGenerationMode)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 hover:bg-muted/50 p-2 rounded transition-colors">
                <RadioGroupItem value="both" id="mode-both" />
                <Label htmlFor="mode-both" className="text-sm font-normal cursor-pointer">
                  Both (Japanese → English & English → Japanese)
                </Label>
              </div>
              <div className="flex items-center space-x-2 hover:bg-muted/50 p-2 rounded transition-colors">
                <RadioGroupItem value="jp_en" id="mode-jp-en" />
                <Label htmlFor="mode-jp-en" className="text-sm font-normal cursor-pointer">
                  Japanese → English only
                </Label>
              </div>
              <div className="flex items-center space-x-2 hover:bg-muted/50 p-2 rounded transition-colors">
                <RadioGroupItem value="en_jp" id="mode-en-jp" />
                <Label htmlFor="mode-en-jp" className="text-sm font-normal cursor-pointer">
                  English → Japanese only
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Choose which card variants to generate for this vocabulary item
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card Stats */}
      <Card className="border-border bg-muted/50 hover:shadow-md hover:bg-muted/70 transition-all">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Fields</p>
              <p className="text-2xl font-bold">
                {
                  [
                    cardData.reading,
                    cardData.kanji,
                    cardData.translation,
                    cardData.sentenceKana,
                    cardData.sentenceEnglish,
                  ].filter((f) => f).length
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Audio Files</p>
              <p className="text-2xl font-bold">{cardData.audioCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completeness</p>
              <p className="text-2xl font-bold">
                {Math.round(
                  ([cardData.reading, cardData.kanji, cardData.translation].filter((f) => f).length / 3) * 100,
                )}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
