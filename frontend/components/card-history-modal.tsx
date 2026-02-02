"use client"

import type { Card } from "@/types/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { History, RotateCcw, Trash2 } from "lucide-react"
import { format } from "date-fns"

interface CardHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: Card[]
  onRestoreCard: (card: Card) => void
  onRestoreAll: (cards: Card[]) => void
  onClearHistory: () => void
  onDeleteFromHistory: (card: Card) => void
}

export default function CardHistoryModal({
  open,
  onOpenChange,
  history,
  onRestoreCard,
  onRestoreAll,
  onClearHistory,
  onDeleteFromHistory,
}: CardHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col overflow-hidden p-0">
        <div className="flex-shrink-0 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Card History
            </DialogTitle>
            <DialogDescription>
              Restore deleted cards from your history. Cards are kept until you clear the history.
            </DialogDescription>
          </DialogHeader>
        </div>

        {history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 min-h-0">
            <div className="text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No cards in history</p>
              <p className="text-xs text-muted-foreground mt-1">Deleted cards will appear here</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pb-6">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                {history.length} card{history.length !== 1 ? "s" : ""} in history
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => onRestoreAll(history)}
                  variant="outline"
                  size="sm"
                  className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <RotateCcw className="mr-2 h-3 w-3" />
                  Restore All
                </Button>
                <Button
                  onClick={onClearHistory}
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Clear History
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {history.map((card) => (
                  <div
                    key={card.id}
                    className="group relative p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {card.reading || card.kanji || "Untitled"}
                          </p>
                          {card.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              • {format(new Date(card.createdAt), "MMM d, yyyy HH:mm")}
                            </span>
                          )}
                        </div>
                        {card.kanji && (
                          <p className="text-sm font-medium text-foreground truncate">
                            {card.kanji}
                            {card.furigana && ` (${card.furigana})`}
                          </p>
                        )}
                        {card.translation && (
                          <p className="text-xs text-muted-foreground truncate">{card.translation}</p>
                        )}
                        {card.sentenceKana && (
                          <p className="text-xs text-muted-foreground mt-1 italic truncate">
                            {card.sentenceKana}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          onClick={() => onRestoreCard(card)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          onClick={() => onDeleteFromHistory(card)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

