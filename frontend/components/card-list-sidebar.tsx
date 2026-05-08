"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { Card as CardData } from "@/types/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Check } from "lucide-react"
import { getCardCompletionState, getJapaneseWord } from "@/lib/card-utils"

interface CardListSidebarProps {
  cards: CardData[]
  activeCardId: string | null
  onSelectCard: (id: string) => void
  onNewCard: () => void
  onDeleteCard: (id: string) => void
  onReorderCards: (fromIndex: number, toIndex: number) => void
  canDeleteCard?: (cardId: string) => boolean
}

export default function CardListSidebar({
  cards,
  activeCardId,
  onSelectCard,
  onNewCard,
  onDeleteCard,
  onReorderCards,
  canDeleteCard,
}: CardListSidebarProps) {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const previousPositions = useRef<Record<string, number>>({})
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const lastLiveReorderTargetRef = useRef<string | null>(null)

  const isCardEmpty = (card: CardData): boolean => {
    return !getJapaneseWord(card) && !card.translation.trim()
  }

  const handleCardDrop = (targetCardId: string) => {
    if (!draggingCardId || draggingCardId === targetCardId) {
      setDraggingCardId(null)
      setDragOverCardId(null)
      return
    }

    const fromIndex = cards.findIndex((card) => card.id === draggingCardId)
    const toIndex = cards.findIndex((card) => card.id === targetCardId)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      setDraggingCardId(null)
      setDragOverCardId(null)
      return
    }

    onReorderCards(fromIndex, toIndex)
    setDraggingCardId(null)
    setDragOverCardId(null)
    lastLiveReorderTargetRef.current = null
  }

  const handleAutoScroll = (clientY: number) => {
    const scrollRoot = scrollAreaRef.current
    if (!scrollRoot) return

    const viewport = scrollRoot.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const edgeThreshold = 48
    const maxStep = 16

    if (clientY < rect.top + edgeThreshold) {
      const intensity = 1 - (clientY - rect.top) / edgeThreshold
      viewport.scrollTop -= Math.max(4, Math.round(maxStep * intensity))
    } else if (clientY > rect.bottom - edgeThreshold) {
      const intensity = 1 - (rect.bottom - clientY) / edgeThreshold
      viewport.scrollTop += Math.max(4, Math.round(maxStep * intensity))
    }
  }

  // FLIP animation: smoothly animate cards into their new order positions.
  useLayoutEffect(() => {
    const currentPositions: Record<string, number> = {}

    for (const card of cards) {
      const element = itemRefs.current[card.id]
      if (element) {
        currentPositions[card.id] = element.getBoundingClientRect().top
      }
    }

    for (const card of cards) {
      const element = itemRefs.current[card.id]
      if (!element) continue

      const previousTop = previousPositions.current[card.id]
      const currentTop = currentPositions[card.id]
      if (previousTop === undefined) continue

      const delta = previousTop - currentTop
      if (delta === 0) continue

      element.style.transition = "none"
      element.style.transform = `translateY(${delta}px)`

      requestAnimationFrame(() => {
        element.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
        element.style.transform = "translateY(0)"
      })
    }

    previousPositions.current = currentPositions
  }, [cards])

  return (
    <div className="h-full flex flex-col border-r border-border bg-muted/30 w-full">
      {/* Header */}
      <div className="border-b border-border p-3 sm:p-4 flex-shrink-0">
        <Button onClick={onNewCard} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Card
        </Button>
      </div>

      {/* Cards List */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto w-full">
        <div className="p-3 sm:p-4 space-y-2 w-full">
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards yet. Create one to start!</p>
          ) : (
            cards.map((card, index) => {
              const completionState = getCardCompletionState(card)
              const isIncomplete = !completionState.isComplete

              return (
                <div
                  key={card.id}
                  ref={(el) => {
                    itemRefs.current[card.id] = el
                  }}
                  className={`group relative p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer ${
                    activeCardId === card.id
                      ? isIncomplete
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10"
                      : isIncomplete
                        ? "border-destructive/50 bg-destructive/5 hover:border-destructive hover:bg-destructive/10"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm"
                  } ${draggingCardId === card.id ? "opacity-50" : ""} ${dragOverCardId === card.id ? "ring-2 ring-primary/60" : ""}`}
                onClick={() => onSelectCard(card.id)}
                draggable
                onDragStart={(e) => {
                  setDraggingCardId(card.id)
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", card.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  handleAutoScroll(e.clientY)

                  if (draggingCardId !== card.id) {
                    setDragOverCardId(card.id)
                    if (lastLiveReorderTargetRef.current !== card.id) {
                      const fromIndex = cards.findIndex((c) => c.id === draggingCardId)
                      const toIndex = cards.findIndex((c) => c.id === card.id)
                      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                        onReorderCards(fromIndex, toIndex)
                        lastLiveReorderTargetRef.current = card.id
                      }
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dragOverCardId === card.id) {
                    setDragOverCardId(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleCardDrop(card.id)
                }}
                onDragEnd={() => {
                  setDraggingCardId(null)
                  setDragOverCardId(null)
                  lastLiveReorderTargetRef.current = null
                }}
              >
                <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                  <div className="flex-1 min-w-0 overflow-hidden pr-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Card {index + 1}</p>
                    <p className={`text-sm font-medium break-words line-clamp-2 overflow-hidden ${isIncomplete ? "text-destructive" : "text-foreground"}`}>
                      {getJapaneseWord(card) || "Untitled"}
                    </p>
                    {card.translation && (
                      <p className="text-xs text-muted-foreground break-words line-clamp-3 mt-1 overflow-hidden">
                        {card.translation}
                      </p>
                    )}
                  </div>
                  {activeCardId === card.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5 ml-1" />
                  )}
                </div>
                {(() => {
                  const canDelete = canDeleteCard
                    ? canDeleteCard(card.id)
                    : !(cards.length === 1 && isCardEmpty(card))
                  
                  if (!canDelete) {
                    return null
                  }
                  
                  return (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCard(card.id)
                      }}
                      variant="ghost"
                      size="sm"
                      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive z-10"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  )
                })()}
              </div>
            )})
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-3 sm:p-4 flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}
