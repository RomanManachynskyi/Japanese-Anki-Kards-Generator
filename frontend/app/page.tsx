"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import CardCreator from "@/components/card-creator"
import CardPreview from "@/components/card-preview"
import CardListSidebar from "@/components/card-list-sidebar"
import type { Card } from "@/types/card"
import { Menu, Settings, Download, Loader2, Trash2, History } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import CardHistoryModal from "@/components/card-history-modal"
import { generateCards, downloadApkg, getConfig } from "@/lib/api"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  getCardCompletionState,
  normalizeCardFromJapaneseInput,
  type CompletionReason,
} from "@/lib/card-utils"
import {
  createCardId,
  createEmptyCardDraft,
  createNewCard,
  hasCardContent,
  toApiCardInput,
} from "@/lib/card-factories"
import { reorderCards } from "@/lib/card-order"

export default function Home() {
  const DEFAULT_DECK_NAME = "Japanese Vocabulary"
  const [cards, setCards] = useState<Card[]>([])
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)
  const [generateDeckDialogOpen, setGenerateDeckDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [cardHistory, setCardHistory] = useState<Card[]>([])
  const [isApiKeySet, setIsApiKeySet] = useState(false)
  const [deckName, setDeckName] = useState(DEFAULT_DECK_NAME)
  const [pendingDeckName, setPendingDeckName] = useState(DEFAULT_DECK_NAME)
  const isMobile = useIsMobile()

  const emptyCard = createEmptyCardDraft()

  useEffect(() => {
    const saved = localStorage.getItem("ankiCards")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const migrated = parsed.map((c: Card) =>
          normalizeCardFromJapaneseInput({ ...c, notes: c.notes ?? "" }),
        )
        setCards(migrated)
        if (migrated.length > 0) {
          setActiveCardId(migrated[0].id)
        }
      } catch (e) {
        console.error("Failed to load saved cards:", e)
      }
    }
    
    const savedHistory = localStorage.getItem("ankiCardsHistory")
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        const migratedHistory = parsedHistory.map((c: Card) =>
          normalizeCardFromJapaneseInput({ ...c, notes: c.notes ?? "" }),
        )
        const sortedHistory = migratedHistory.sort((a: Card, b: Card) => {
          const aTime = a.createdAt || 0
          const bTime = b.createdAt || 0
          return bTime - aTime
        })
        setCardHistory(sortedHistory)
      } catch (e) {
        console.error("Failed to load card history:", e)
      }
    }
    
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    const loadApiKeyStatus = async () => {
      try {
        const config = await getConfig()
        setIsApiKeySet(config.api_key_set)
      } catch {
        const saved = localStorage.getItem("audioConfig")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setIsApiKeySet(Boolean(parsed.apiKey))
            return
          } catch {
          }
        }
        setIsApiKeySet(false)
      }
    }

    loadApiKeyStatus()
  }, [])

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem("ankiCards", JSON.stringify(cards))
      } catch (error) {
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.error("localStorage quota exceeded. Attempting to save without images...")
          const cardsWithoutImages = cards.map((card) => ({
            ...card,
            sentenceImage: "",
          }))
          try {
            localStorage.setItem("ankiCards", JSON.stringify(cardsWithoutImages))
            toast.error("Storage limit exceeded", {
              description: "Images were removed to save space. Please reduce image sizes or clear history.",
            })
          } catch (e) {
            console.error("Failed to save even without images:", e)
            toast.error("Storage limit exceeded", {
              description: "Unable to save cards. Please clear history or reduce the number of cards.",
            })
          }
        } else {
          console.error("Failed to save cards:", error)
        }
      }
    }
  }, [cards, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem("ankiCardsHistory", JSON.stringify(cardHistory))
      } catch (error) {
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.error("localStorage quota exceeded for history. Attempting to save without images...")
          const historyWithoutImages = cardHistory.map((card) => ({
            ...card,
            sentenceImage: "",
          }))
          try {
            localStorage.setItem("ankiCardsHistory", JSON.stringify(historyWithoutImages))
            toast.error("Storage limit exceeded", {
              description: "Images were removed from history to save space.",
            })
          } catch (e) {
            console.error("Failed to save history even without images:", e)
            const trimmedHistory = historyWithoutImages.slice(0, Math.floor(historyWithoutImages.length / 2))
            try {
              localStorage.setItem("ankiCardsHistory", JSON.stringify(trimmedHistory))
              toast.warning("History trimmed", {
                description: "Old history entries were removed to save space.",
              })
            } catch (e2) {
              console.error("Failed to save trimmed history:", e2)
            }
          }
        } else {
          console.error("Failed to save history:", error)
        }
      }
    }
  }, [cardHistory, isHydrated])

  const currentCard = activeCardId ? cards.find((c) => c.id === activeCardId) : null
  const cardData = currentCard || emptyCard

  const handleNewCard = () => {
    const newCard: Card = createNewCard()
    setCards((prevCards) => [...prevCards, newCard])
    setActiveCardId(newCard.id)
  }

  const isCardEmpty = (card: Card): boolean => getCardCompletionState(card).reasons.length >= 2

  const handleDeleteCard = (id: string) => {
    const cardToDelete = cards.find((c) => c.id === id)
    if (!cardToDelete) return

    if (cards.length === 1 && isCardEmpty(cardToDelete)) {
      toast.error("Cannot delete last empty card", {
        description: "You must have at least one card. Add content to this card or create a new one.",
      })
      return
    }

    if (!isCardEmpty(cardToDelete)) {
      setCardHistory((prevHistory) => {
        const exists = prevHistory.some((c) => c.id === id)
        if (exists) {
          return prevHistory
        }
        return [cardToDelete, ...prevHistory]
      })
    }
    
    const updatedCards = cards.filter((c) => c.id !== id)
    setCards(updatedCards)
    if (activeCardId === id) {
      setActiveCardId(updatedCards[0]?.id || null)
    }
    
    if (!isCardEmpty(cardToDelete)) {
      toast.success("Card deleted", {
        description: "Card moved to history",
      })
    }
  }

  const handleClearAllCards = () => {
    const nonEmptyCards = cards.filter((card) => !isCardEmpty(card))
    
    if (nonEmptyCards.length > 0) {
      setCardHistory((prevHistory) => {
        const newCards = nonEmptyCards.filter(
          (card) => !prevHistory.some((h) => h.id === card.id)
        )
        return [...newCards, ...prevHistory]
      })
    }
    
    setCards([])
    setActiveCardId(null)
    setClearAllDialogOpen(false)
    setDeleteConfirmation("")
    try {
      localStorage.setItem("ankiCards", "[]")
    } catch (_) {}

    const emptyCount = cards.length - nonEmptyCards.length
    if (nonEmptyCards.length > 0) {
      toast.success("All cards cleared", {
        description: `${nonEmptyCards.length} card${nonEmptyCards.length !== 1 ? "s" : ""} moved to history${emptyCount > 0 ? `, ${emptyCount} empty card${emptyCount !== 1 ? "s" : ""} removed` : ""}`,
      })
    } else {
      toast.success("All cards cleared", {
        description: "No cards were saved to history (all were empty)",
      })
    }
  }

  const handleSelectCard = (id: string) => {
    setActiveCardId(id)
  }

  const handleReorderCards = (fromIndex: number, toIndex: number) => {
    setCards((prevCards) => reorderCards(prevCards, fromIndex, toIndex))
  }

  const updateCardData = (data: typeof cardData) => {
    if (activeCardId) {
      setCards((previousCards) =>
        previousCards.map((c) =>
          c.id === activeCardId
            ? {
                ...c,
                ...data,
              }
            : c,
        ),
      )
    }
  }

  const incompleteCards = cards
    .map((card, index) => ({
      index: index + 1,
      state: getCardCompletionState(card),
    }))
    .filter((item) => !item.state.isComplete)

  const hasIncompleteCards = incompleteCards.length > 0

  const completionReasonLabel: Record<CompletionReason, string> = {
    missing_japanese_word: "missing Japanese word",
    missing_translation: "missing translation",
    incomplete_furigana: "incomplete furigana",
    invalid_path_characters: "contains forbidden path characters",
  }

  const handleGenerateCards = () => {
    const nonEmptyCards = cards.filter(hasCardContent)
    
    if (nonEmptyCards.length === 0) {
      toast.error("No cards to generate", {
        description: "Please add at least one card with content",
      })
      return
    }

    if (hasIncompleteCards) {
      toast.error("Cannot generate cards", {
        description: "Please complete all unfinished cards before generating.",
      })
      return
    }

    setPendingDeckName(deckName)
    setGenerateDeckDialogOpen(true)
  }

  const handleConfirmGenerateCards = async () => {
    const nonEmptyCards = cards.filter(hasCardContent)

    setIsGenerating(true)
    setGenerateDeckDialogOpen(false)

    try {
      const apiCards = nonEmptyCards.map(toApiCardInput)

      const normalizedDeckName = pendingDeckName.trim() || DEFAULT_DECK_NAME
      setDeckName(normalizedDeckName)
      const response = await generateCards({ cards: apiCards, deck_name: normalizedDeckName })

      if (response.success && response.apkg_path) {
        toast.success("Cards generated successfully!", {
          description: `${response.total_cards} cards with ${response.total_audio_files} audio files`,
        })

        const blob = await downloadApkg(response.apkg_path, response.run_id)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "vocabulary.apkg"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast.error("Generation failed", {
          description: response.message,
        })
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (isHydrated && cards.length === 0 && activeCardId === null) {
      handleNewCard()
    }
  }, [isHydrated, cards.length, activeCardId])

  const handleRestoreCard = (card: Card) => {
    const exists = cards.some((c) => c.id === card.id)
    if (exists) {
      toast.error("Card already exists", {
        description: "This card is already in your collection",
      })
      return
    }

    const restoredCard: Card = {
      ...normalizeCardFromJapaneseInput(card),
      id: createCardId(),
      createdAt: Date.now(),
      notes: card.notes ?? "",
    }

    setCards((prevCards) => [...prevCards, restoredCard])
    setActiveCardId(restoredCard.id)
    
    setCardHistory((prevHistory) => prevHistory.filter((c) => c.id !== card.id))
    
    toast.success("Card restored", {
      description: "Card has been restored to your collection",
    })
  }

  const handleRestoreAll = (cardsToRestore: Card[]) => {
    const newCards = cardsToRestore.filter(
      (card) => !cards.some((c) => c.id === card.id)
    )

    if (newCards.length === 0) {
      toast.error("No cards to restore", {
        description: "All cards are already in your collection",
      })
      return
    }

    const restoredCards: Card[] = newCards.map((card) => ({
      ...normalizeCardFromJapaneseInput(card),
      id: `${createCardId()}-${Math.random().toString(36).slice(2, 11)}`,
      createdAt: Date.now(),
      notes: card.notes ?? "",
    }))

    setCards((prevCards) => [...prevCards, ...restoredCards])
    if (restoredCards.length > 0) {
      setActiveCardId(restoredCards[0].id)
    }

    setCardHistory((prevHistory) =>
      prevHistory.filter((c) => !cardsToRestore.some((r) => r.id === c.id))
    )

    toast.success("Cards restored", {
      description: `${restoredCards.length} card${restoredCards.length !== 1 ? "s" : ""} restored`,
    })
  }

  const handleClearHistory = () => {
    setCardHistory([])
    toast.success("History cleared", {
      description: "All cards have been permanently removed from history",
    })
  }

  const handleDeleteFromHistory = (card: Card) => {
    setCardHistory((prevHistory) => prevHistory.filter((c) => c.id !== card.id))
    toast.success("Card removed from history", {
      description: "Card has been permanently deleted from history",
    })
  }

  if (!isHydrated) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex h-screen flex-col">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Anki Card Creator</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Build beautiful flashcards for Japanese vocabulary learning
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHistoryOpen(true)}
                  title="Card history"
                  className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setSettingsOpen(true)} 
                  title="Audio settings"
                  className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden h-8 w-8 sm:h-10 sm:w-10 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {sidebarOpen && (
            <div className="w-64 hidden lg:flex flex-col border-r border-border">
              <CardListSidebar
                cards={cards}
                activeCardId={activeCardId}
                onSelectCard={handleSelectCard}
                onNewCard={handleNewCard}
                onDeleteCard={handleDeleteCard}
                onReorderCards={handleReorderCards}
              />
            </div>
          )}

          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="w-64 p-0 sm:w-80">
                <CardListSidebar
                  cards={cards}
                  activeCardId={activeCardId}
                  onSelectCard={(id) => {
                    handleSelectCard(id)
                    setSidebarOpen(false)
                  }}
                  onNewCard={() => {
                    handleNewCard()
                    setSidebarOpen(false)
                  }}
                  onDeleteCard={handleDeleteCard}
                  onReorderCards={handleReorderCards}
                />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex-1 overflow-auto">
            <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <CardCreator cardData={cardData} setCardData={updateCardData} />
                <CardPreview cardData={cardData} setCardData={updateCardData} />
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-border bg-card">
          <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {cards.length} card{cards.length !== 1 ? "s" : ""} created
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
                <Button
                  onClick={() => setClearAllDialogOpen(true)}
                  disabled={cards.length === 0}
                  variant="destructive"
                  className="flex-1 sm:flex-initial hover:bg-destructive/90 hover:scale-105 transition-all disabled:hover:scale-100 text-xs sm:text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block flex-1 sm:flex-initial">
                      <Button
                        onClick={handleGenerateCards}
                        disabled={cards.length === 0 || isGenerating || hasIncompleteCards || !isApiKeySet}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all disabled:hover:scale-100 text-xs sm:text-sm"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span className="hidden sm:inline">Generating...</span>
                            <span className="sm:hidden">Generating</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Generate Cards</span>
                            <span className="sm:hidden">Generate</span>
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {(cards.length === 0 || hasIncompleteCards || isGenerating || !isApiKeySet) && (
                    <TooltipContent 
                      className="bg-popover text-popover-foreground border border-border shadow-md"
                      hideArrow={true}
                    >
                      {isGenerating ? (
                        "Generating cards, please wait..."
                      ) : cards.length === 0 ? (
                        "Please add at least one card before generating"
                      ) : !isApiKeySet ? (
                        "Please set your ElevenLabs API key in Audio Settings"
                      ) : hasIncompleteCards ? (
                        <div className="space-y-1">
                          {incompleteCards.map((item) => (
                            <p key={item.index}>
                              Card {item.index}: {item.state.reasons.map((reason) => completionReasonLabel[reason]).join(", ")}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onApiKeyStatusChange={setIsApiKeySet}
      />
      <CardHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={cardHistory}
        onRestoreCard={handleRestoreCard}
        onRestoreAll={handleRestoreAll}
        onClearHistory={handleClearHistory}
        onDeleteFromHistory={handleDeleteFromHistory}
      />

      <AlertDialog
        open={generateDeckDialogOpen}
        onOpenChange={setGenerateDeckDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Cards</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a deck name for the generated Anki package.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="generation-deck-name" className="text-sm font-medium">
              Deck name
            </Label>
            <Input
              id="generation-deck-name"
              type="text"
              value={pendingDeckName}
              onChange={(event) => setPendingDeckName(event.target.value)}
              placeholder={DEFAULT_DECK_NAME}
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerateCards}>
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={clearAllDialogOpen}
        onOpenChange={(open) => {
          setClearAllDialogOpen(open)
          if (!open) {
            setDeleteConfirmation("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Cards</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {cards.length} card{cards.length !== 1 ? "s" : ""} you have created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirmation" className="text-sm font-medium">
              Type <span className="font-mono font-bold text-destructive">delete</span> to confirm:
            </Label>
            <Input
              id="delete-confirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete"
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllCards}
              disabled={deleteConfirmation !== "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
