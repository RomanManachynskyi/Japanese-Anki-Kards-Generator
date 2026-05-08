"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import ImageUpload from "@/components/image-upload"
import type { CardGenerationMode } from "@/types/card"
import {
  containsKanji,
  FORBIDDEN_PATH_CHARACTERS,
  generateFuriganaTemplate,
  getForbiddenPathCharacters,
} from "@/lib/card-utils"

interface CardCreatorProps {
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
    notes: string
  }
  setCardData: (data: any) => void
}

export default function CardCreator({ cardData, setCardData }: CardCreatorProps) {
  const japaneseWord = cardData.kanji || cardData.reading
  const showFuriganaField = containsKanji(japaneseWord)
  const forbiddenCharsLabel = FORBIDDEN_PATH_CHARACTERS.join(" ")
  const forbiddenWordChars = getForbiddenPathCharacters(japaneseWord)
  const forbiddenFuriganaChars = getForbiddenPathCharacters(cardData.furigana)
  const forbiddenSentenceKanaChars = getForbiddenPathCharacters(cardData.sentenceKana)

  const handleInputChange = (field: string, value: string | number) => {
    const updates: any = {
      ...cardData,
    }
    if (field !== "japaneseWord") {
      updates[field] = value
    }

    // Keep one Japanese input as the UI source of truth.
    if (field === "japaneseWord" && typeof value === "string") {
      const nextWord = value
      const currentFurigana = cardData.furigana

      if (containsKanji(nextWord)) {
        updates.kanji = nextWord
        updates.reading = ""
        const previousTemplate = generateFuriganaTemplate(cardData.kanji || cardData.reading)
        if (!currentFurigana || currentFurigana === previousTemplate) {
          updates.furigana = generateFuriganaTemplate(nextWord)
        }
      } else {
        updates.reading = nextWord
        updates.kanji = ""
        updates.furigana = ""
      }
    }

    setCardData(updates)
  }

  const handleClear = () => {
    setCardData({
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
    })
  }

  return (
    <div className="space-y-6">
      {/* Front Side Card */}
      <Card className="border-border bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            Card Front
          </CardTitle>
          <CardDescription>Primary content shown on the front of the card</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Japanese Word */}
          <div className="space-y-2">
            <Label htmlFor="japaneseWord" className="text-sm font-medium text-foreground">
              Japanese Word
            </Label>
            <Input
              id="japaneseWord"
              placeholder="e.g., ビジネス / 色々 / 冷たい"
              value={japaneseWord}
              onChange={(e) => handleInputChange("japaneseWord", e.target.value)}
              className={`border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors ${
                forbiddenWordChars.length > 0 ? "border-destructive focus-visible:ring-destructive/30" : ""
              }`}
            />
            <p className="text-xs text-muted-foreground">
              Enter kana-only or kanji word. Furigana appears automatically for kanji.
            </p>
            {forbiddenWordChars.length > 0 && (
              <p className="text-xs text-destructive">
                Forbidden characters in Japanese word: {forbiddenWordChars.join(" ")}. Not allowed: {forbiddenCharsLabel}
              </p>
            )}
          </div>

          {/* Furigana Section */}
          {showFuriganaField && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
              <Label className="text-sm font-medium text-foreground">Furigana</Label>
              <div>
                <Label htmlFor="furigana" className="text-xs text-muted-foreground">
                  Fill all readings inside brackets
                </Label>
                <Input
                  id="furigana"
                  placeholder="e.g., 色[いろ] 々[いろ]"
                  value={cardData.furigana}
                  onChange={(e) => handleInputChange("furigana", e.target.value)}
                  className={`mt-1 border-input bg-card text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors ${
                    forbiddenFuriganaChars.length > 0 ? "border-destructive focus-visible:ring-destructive/30" : ""
                  }`}
                />
                {forbiddenFuriganaChars.length > 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    Forbidden characters in furigana: {forbiddenFuriganaChars.join(" ")}. Not allowed: {forbiddenCharsLabel}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Translation */}
          <div className="space-y-2">
            <Label htmlFor="translation" className="text-sm font-medium text-foreground">
              Translation
            </Label>
            <Input
              id="translation"
              placeholder="e.g., history, business"
              value={cardData.translation}
              onChange={(e) => handleInputChange("translation", e.target.value)}
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Back Side Card */}
      <Card className="border-border bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="h-2 w-2 rounded-full bg-accent"></div>
            Card Back & Context
          </CardTitle>
          <CardDescription>Additional information and example usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Example Sentence - Kana */}
          <div className="space-y-2">
            <Label htmlFor="sentenceKana" className="text-sm font-medium text-foreground">
              Example Sentence (Kana)
            </Label>
            <Textarea
              id="sentenceKana"
              placeholder="e.g., 郵便局に行きます"
              value={cardData.sentenceKana}
              onChange={(e) => handleInputChange("sentenceKana", e.target.value)}
              className={`border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors ${
                forbiddenSentenceKanaChars.length > 0 ? "border-destructive focus-visible:ring-destructive/30" : ""
              }`}
              rows={2}
            />
            {forbiddenSentenceKanaChars.length > 0 && (
              <p className="text-xs text-destructive">
                Forbidden characters in Japanese sentence: {forbiddenSentenceKanaChars.join(" ")}. Not allowed: {forbiddenCharsLabel}
              </p>
            )}
          </div>

          {/* Example Sentence - English */}
          <div className="space-y-2">
            <Label htmlFor="sentenceEnglish" className="text-sm font-medium text-foreground">
              Example Sentence (English)
            </Label>
            <Textarea
              id="sentenceEnglish"
              placeholder="e.g., I will go to the post office"
              value={cardData.sentenceEnglish}
              onChange={(e) => handleInputChange("sentenceEnglish", e.target.value)}
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
              rows={2}
            />
          </div>

          {/* Audio Count */}
          <div className="space-y-2">
            <Label htmlFor="audioCount" className="text-sm font-medium text-foreground">
              Audio Recordings
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="audioCount"
                type="number"
                min="0"
                max="10"
                value={cardData.audioCount}
                onChange={(e) => handleInputChange("audioCount", Number.parseInt(e.target.value))}
                className="border-input bg-muted text-foreground hover:border-primary/50 focus:border-primary transition-colors"
              />
              <span className="text-sm text-muted-foreground">
                {cardData.audioCount > 0 && `${cardData.audioCount} file${cardData.audioCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>

          {/* Sentence Image */}
          <div className="space-y-2">
            <ImageUpload
              id="sentenceImage"
              label="Sentence Image"
              value={cardData.sentenceImage}
              onChange={(value) => handleInputChange("sentenceImage", value)}
            />
            <p className="text-xs text-muted-foreground">
              Image will be used in the Word Image field. Press Ctrl+V to paste.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Optional notes (shown on the card back via Notes button)"
              value={cardData.notes ?? ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleClear}
          variant="outline"
          size="lg"
          className="border-border text-foreground hover:bg-muted hover:border-destructive/50 hover:text-destructive bg-transparent transition-colors"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  )
}
