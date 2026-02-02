"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import ImageUpload from "@/components/image-upload"
import type { CardGenerationMode } from "@/types/card"

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
  }
  setCardData: (data: any) => void
}

export default function CardCreator({ cardData, setCardData }: CardCreatorProps) {
  // Check if a character is a kanji (CJK Unified Ideographs)
  const isKanji = (char: string): boolean => {
    const code = char.charCodeAt(0)
    return (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
      (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
      (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
      (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility Ideographs
    )
  }

  // Check if a character is hiragana
  const isHiragana = (char: string): boolean => {
    const code = char.charCodeAt(0)
    return code >= 0x3040 && code <= 0x309F
  }

  // Check if a character is katakana
  const isKatakana = (char: string): boolean => {
    const code = char.charCodeAt(0)
    return code >= 0x30A0 && code <= 0x30FF
  }

  // Check if text consists of only one kanji with no other characters
  const isSingleKanjiOnly = (text: string): boolean => {
    if (!text || text.length === 0) return false
    
    const trimmed = text.trim()
    if (trimmed.length !== 1) return false
    
    // Check if it's a kanji
    if (!isKanji(trimmed)) return false
    
    // Check if there are no other characters (hiragana, katakana, or other kanji)
    // Since we already checked length === 1 and it's a kanji, this is already satisfied
    return true
  }

  // Generate furigana brackets for kanji
  const generateFuriganaBrackets = (kanji: string): string => {
    if (!kanji) return ""
    
    let result = ""
    for (let i = 0; i < kanji.length; i++) {
      const char = kanji[i]
      if (isKanji(char)) {
        result += `${char}[]`
      } else {
        result += char
      }
    }
    return result
  }

  const handleInputChange = (field: string, value: string | number) => {
    const updates: any = {
      ...cardData,
      [field]: value,
    }

    // Auto-generate furigana brackets when kanji changes
    if (field === "kanji" && typeof value === "string") {
      const newKanji = value
      const currentFurigana = cardData.furigana
      
      // Don't auto-generate if it's a single kanji only (no other characters)
      if (isSingleKanjiOnly(newKanji)) {
        // Don't auto-generate furigana for single kanji
        updates.furigana = currentFurigana || ""
      } else {
        // Only auto-generate if furigana is empty or matches old kanji pattern
        if (!currentFurigana || currentFurigana === generateFuriganaBrackets(cardData.kanji)) {
          updates.furigana = generateFuriganaBrackets(newKanji)
        }
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
          {/* Reading (Kana) */}
          <div className="space-y-2">
            <Label htmlFor="reading" className="text-sm font-medium text-foreground">
              Reading (Kana)
            </Label>
            <Input
              id="reading"
              placeholder="e.g., ビジネス"
              value={cardData.reading}
              onChange={(e) => handleInputChange("reading", e.target.value)}
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground">Katakana or Hiragana pronunciation</p>
          </div>

          {/* Kanji Section */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <Label className="text-sm font-medium text-foreground">Kanji (Optional)</Label>
            <div className="space-y-3">
              <div>
                <Label htmlFor="kanji" className="text-xs text-muted-foreground">
                  Kanji Characters
                </Label>
                <Input
                  id="kanji"
                  placeholder="e.g., 歴史"
                  value={cardData.kanji}
                  onChange={(e) => handleInputChange("kanji", e.target.value)}
                  className="mt-1 border-input bg-card text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="furigana" className="text-xs text-muted-foreground">
                  Furigana
                </Label>
                <Input
                  id="furigana"
                  placeholder="e.g., 歴[れき]史[し]"
                  value={cardData.furigana}
                  onChange={(e) => handleInputChange("furigana", e.target.value)}
                  className="mt-1 border-input bg-card text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

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
              className="border-input bg-muted text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary transition-colors"
              rows={2}
            />
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
              Image will be used in both Sentence-Image and Sentence-English fields. Press Ctrl+V to paste.
            </p>
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
