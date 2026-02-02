"use client"

import type { Card as CardData } from "@/types/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Check } from "lucide-react"

interface CardListSidebarProps {
  cards: CardData[]
  activeCardId: string | null
  onSelectCard: (id: string) => void
  onNewCard: () => void
  onDeleteCard: (id: string) => void
  canDeleteCard?: (cardId: string) => boolean
}

export default function CardListSidebar({
  cards,
  activeCardId,
  onSelectCard,
  onNewCard,
  onDeleteCard,
  canDeleteCard,
}: CardListSidebarProps) {
  const isCardEmpty = (card: CardData): boolean => {
    return !card.reading && !card.kanji && !card.translation
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
      <ScrollArea className="flex-1 overflow-auto w-full">
        <div className="p-3 sm:p-4 space-y-2 w-full">
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards yet. Create one to start!</p>
          ) : (
            cards.map((card, index) => (
              <div
                key={card.id}
                className={`group relative p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer ${
                  activeCardId === card.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm"
                }`}
                onClick={() => onSelectCard(card.id)}
              >
                <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                  <div className="flex-1 min-w-0 overflow-hidden pr-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Card {index + 1}</p>
                    <p className="text-sm font-medium text-foreground break-words line-clamp-2 overflow-hidden">
                      {card.reading || card.kanji || "Untitled"}
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
            ))
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
