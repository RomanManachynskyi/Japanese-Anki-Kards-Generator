"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
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
type DropPosition = "before" | "after"

const EDGE_SCROLL_THRESHOLD_PX = 48
const MAX_AUTO_SCROLL_STEP_PX = 8
const MIN_AUTO_SCROLL_STEP_PX = 2
const REORDER_ANIMATION_DURATION_MS = 220
const REORDER_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"

const isCardEmpty = (card: CardData): boolean => {
  return !getJapaneseWord(card) && !card.translation.trim()
}

const canDeleteCardByDefault = (card: CardData, totalCards: number): boolean => {
  return !(totalCards === 1 && isCardEmpty(card))
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
  const [dropTarget, setDropTarget] = useState<{ cardId: string; position: DropPosition } | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const previousPositions = useRef<Record<string, number>>({})
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const latestPointerYRef = useRef<number | null>(null)

  const stopDragging = () => {
    setDraggingCardId(null)
    setDropTarget(null)
    latestPointerYRef.current = null
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
  }

  const runAutoScroll = () => {
    if (draggingCardId === null || latestPointerYRef.current === null) {
      autoScrollFrameRef.current = null
      return
    }
    const scrollRoot = scrollAreaRef.current
    if (!scrollRoot) return

    const viewport = scrollRoot.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
    if (!viewport) {
      autoScrollFrameRef.current = null
      return
    }

    const clientY = latestPointerYRef.current
    const rect = viewport.getBoundingClientRect()
    let scrollDelta = 0

    if (clientY < rect.top + EDGE_SCROLL_THRESHOLD_PX) {
      const intensity = 1 - (clientY - rect.top) / EDGE_SCROLL_THRESHOLD_PX
      scrollDelta = -Math.max(MIN_AUTO_SCROLL_STEP_PX, Math.round(MAX_AUTO_SCROLL_STEP_PX * intensity))
    } else if (clientY > rect.bottom - EDGE_SCROLL_THRESHOLD_PX) {
      const intensity = 1 - (rect.bottom - clientY) / EDGE_SCROLL_THRESHOLD_PX
      scrollDelta = Math.max(MIN_AUTO_SCROLL_STEP_PX, Math.round(MAX_AUTO_SCROLL_STEP_PX * intensity))
    }

    if (scrollDelta === 0) {
      autoScrollFrameRef.current = null
      return
    }

    viewport.scrollTop += scrollDelta
    autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll)
  }

  const startAutoScroll = (clientY: number) => {
    latestPointerYRef.current = clientY
    if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll)
    }
  }

  const getScrollViewport = (): HTMLDivElement | null => {
    const scrollRoot = scrollAreaRef.current
    if (!scrollRoot) {
      return null
    }
    return scrollRoot.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
  }

  useEffect(() => {
    if (!draggingCardId) {
      return
    }

    const handleGlobalWheelWhileDragging = (event: WheelEvent) => {
      const viewport = getScrollViewport()
      if (!viewport) {
        return
      }
      viewport.scrollTop += event.deltaY
      event.preventDefault()
    }

    window.addEventListener("wheel", handleGlobalWheelWhileDragging, { passive: false, capture: true })
    return () => {
      window.removeEventListener("wheel", handleGlobalWheelWhileDragging, { capture: true })
    }
  }, [draggingCardId])

  const handleDropReorder = (targetCardId: string) => {
    if (!draggingCardId) {
      stopDragging()
      return
    }

    const fromIndex = cards.findIndex((card) => card.id === draggingCardId)
    const targetCardIndex = cards.findIndex((card) => card.id === targetCardId)
    if (fromIndex === -1 || targetCardIndex === -1) {
      stopDragging()
      return
    }

    const targetPosition = dropTarget?.cardId === targetCardId ? dropTarget.position : "before"
    let insertionIndex = targetPosition === "before" ? targetCardIndex : targetCardIndex + 1
    if (fromIndex < insertionIndex) {
      insertionIndex -= 1
    }
    if (fromIndex === insertionIndex) {
      stopDragging()
      return
    }

    const toIndex = Math.max(0, Math.min(cards.length - 1, insertionIndex))
    onReorderCards(fromIndex, toIndex)
    stopDragging()
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
        element.style.transition = `transform ${REORDER_ANIMATION_DURATION_MS}ms ${REORDER_ANIMATION_EASING}`
        element.style.transform = "translateY(0)"
      })
    }

    previousPositions.current = currentPositions
  }, [cards])

  const getDeletePermission = (card: CardData): boolean => {
    if (canDeleteCard) {
      return canDeleteCard(card.id)
    }
    return canDeleteCardByDefault(card, cards.length)
  }

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
                  } ${draggingCardId === card.id ? "opacity-50" : ""} ${
                    dropTarget?.cardId === card.id ? "ring-1 ring-primary/30" : ""
                  } ${
                    dropTarget?.cardId === card.id && dropTarget.position === "before"
                      ? "before:absolute before:-top-1 before:left-2 before:right-2 before:h-0.5 before:rounded-full before:bg-primary before:content-['']"
                      : ""
                  } ${
                    dropTarget?.cardId === card.id && dropTarget.position === "after"
                      ? "after:absolute after:-bottom-1 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary after:content-['']"
                      : ""
                  }`}
                onClick={() => onSelectCard(card.id)}
                draggable
                onDragStart={(e) => {
                  setDraggingCardId(card.id)
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", card.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  startAutoScroll(e.clientY)

                  if (draggingCardId !== card.id) {
                    const cardElement = itemRefs.current[card.id]
                    const cardRect = cardElement?.getBoundingClientRect()
                    const position: DropPosition =
                      cardRect && e.clientY > cardRect.top + cardRect.height / 2 ? "after" : "before"
                    setDropTarget({ cardId: card.id, position })
                  }
                }}
                onDragLeave={() => {
                  if (dropTarget?.cardId === card.id) {
                    setDropTarget(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDropReorder(card.id)
                }}
                onDragEnd={() => {
                  stopDragging()
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
                {getDeletePermission(card) && (
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
                )}
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
