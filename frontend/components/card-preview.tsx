"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2 } from "lucide-react"
import { furiganaToRuby } from "@/lib/furigana-parser"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { CardDraft, CardGenerationMode } from "@/types/card"

interface CardPreviewProps {
  cardData: CardDraft
  setCardData?: (data: CardDraft) => void
}

const CARD_SURFACE_CLASS =
  "group relative mx-auto aspect-[5/7] w-full max-w-[420px] cursor-pointer overflow-hidden rounded-xl border border-[#2f2f2f] bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-6 text-[#f5f5f5] shadow-sm transition-all duration-300 hover:shadow-lg"
const SECTION_DIVIDER_CLASS = "my-6 h-px bg-gradient-to-r from-transparent via-[#374151] to-transparent"

function EmptyPreview() {
  return (
    <div className="flex h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
      <p className="text-sm text-muted-foreground">Fill in the form to preview your card</p>
    </div>
  )
}

function CardFront({ word }: { word: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <p className="text-[clamp(2.5rem,10vw,5rem)] font-semibold leading-tight tracking-[0.05em] text-[#f5f5f5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        {word}
      </p>
    </div>
  )
}

function NotesOverlay({
  notes,
  showNotes,
  onToggleNotes,
  onCloseNotes,
}: {
  notes: string
  showNotes: boolean
  onToggleNotes: () => void
  onCloseNotes: () => void
}) {
  return (
    <>
      <button
        type="button"
        className="absolute right-0 top-0 z-20 rounded-md border border-[#4b5563] bg-[#374151] px-3 py-1 text-xs font-medium text-[#e5e7eb] transition-colors hover:bg-[#4b5563]"
        onClick={(event) => {
          event.stopPropagation()
          onToggleNotes()
        }}
      >
        Notes
      </button>
      {showNotes && (
        <div
          className="absolute inset-0 z-20 rounded-lg bg-black/25"
          onClick={(event) => {
            event.stopPropagation()
            onCloseNotes()
          }}
        />
      )}
      {showNotes && (
        <div
          className="absolute right-3 top-12 z-30 max-h-[60%] w-[90%] max-w-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#374151] bg-[#2d2d2d] p-3 text-sm text-[#e5e7eb]"
          onClick={(event) => event.stopPropagation()}
        >
          {notes}
        </div>
      )}
    </>
  )
}

function CardBack({ cardData, showNotes, setShowNotes }: { cardData: CardDraft; showNotes: boolean; setShowNotes: (show: boolean) => void }) {
  return (
    <div className="relative h-full w-full overflow-y-auto pt-6">
      {cardData.notes?.trim() && (
        <NotesOverlay
          notes={cardData.notes}
          showNotes={showNotes}
          onToggleNotes={() => setShowNotes(!showNotes)}
          onCloseNotes={() => setShowNotes(false)}
        />
      )}

      <section className="mb-6 animate-in fade-in-0 duration-200 text-center">
        <div className="mb-3 text-[clamp(2rem,8vw,3.5rem)] font-semibold leading-snug text-[#f5f5f5] [&_ruby_rt]:text-[0.4em] [&_ruby_rt]:font-medium [&_ruby_rt]:text-[#9ca3af]">
          {cardData.furigana ? furiganaToRuby(cardData.furigana) : cardData.kanji || cardData.reading}
        </div>

        {!cardData.kanji && cardData.reading && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2d2d2d] px-4 py-2">
            <span className="text-xs uppercase tracking-wider text-[#9ca3af]">Reading:</span>
            <span className="text-xl font-medium text-[#e5e7eb]">{cardData.reading}</span>
          </div>
        )}

        {cardData.audioCount > 0 && (
          <button
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#0f0f0f] transition-all hover:-translate-y-px hover:bg-[#e5e7eb]"
            onClick={(event) => event.stopPropagation()}
          >
            <Volume2 className="h-4 w-4" />
            Word Audio
          </button>
        )}
      </section>

      <div className={SECTION_DIVIDER_CLASS} />
      <section className="mb-6 animate-in fade-in-0 duration-200 text-center">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7280]">Translation</span>
        <p className="text-2xl font-medium leading-relaxed text-[#f3f4f6]">{cardData.translation || " "}</p>
      </section>

      {(cardData.sentenceKana || cardData.sentenceEnglish) && (
        <>
          <div className={SECTION_DIVIDER_CLASS} />
          <section className="mb-6 animate-in fade-in-0 duration-200 text-center">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7280]">Example</span>
            {cardData.sentenceKana && (
              <p className="mb-3 text-xl font-medium leading-relaxed text-[#f3f4f6]">{cardData.sentenceKana}</p>
            )}
            {cardData.sentenceEnglish && (
              <p className="mb-4 text-base italic leading-relaxed text-[#9ca3af]">{cardData.sentenceEnglish}</p>
            )}
            {cardData.audioCount > 0 && (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-[#4b5563] bg-transparent px-4 py-2 text-xs font-medium text-[#d1d5db] transition-colors hover:bg-[#2d2d2d]"
                onClick={(event) => event.stopPropagation()}
              >
                <Volume2 className="h-3.5 w-3.5" />
                Sentence Audio
              </button>
            )}
          </section>
        </>
      )}

      {cardData.sentenceImage && (
        <>
          <div className={SECTION_DIVIDER_CLASS} />
          <section className="animate-in fade-in-0 duration-200 text-center">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7280]">Visual</span>
            <div className="inline-block max-w-full overflow-visible rounded-2xl bg-[#2d2d2d]">
              <img
                src={cardData.sentenceImage}
                alt="Word visual"
                className="block h-auto max-h-[220px] w-auto max-w-full object-contain"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default function CardPreview({ cardData, setCardData }: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const handleInputChange = (field: keyof CardDraft, value: string | number) => {
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
            <EmptyPreview />
          ) : (
            <div className={CARD_SURFACE_CLASS} onClick={() => setIsFlipped(!isFlipped)}>
              {!isFlipped && <CardFront word={cardData.kanji || cardData.reading} />}
              {isFlipped && <CardBack cardData={cardData} showNotes={showNotes} setShowNotes={setShowNotes} />}

              <div className="absolute bottom-2 right-3 text-[11px] text-[#9ca3af] opacity-70">
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
