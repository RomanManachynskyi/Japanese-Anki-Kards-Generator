import type { Card } from "@/types/card"

export const reorderCards = (cards: Card[], fromIndex: number, toIndex: number): Card[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= cards.length ||
    toIndex >= cards.length ||
    fromIndex === toIndex
  ) {
    return cards
  }

  const reorderedCards = [...cards]
  const [movedCard] = reorderedCards.splice(fromIndex, 1)
  reorderedCards.splice(toIndex, 0, movedCard)
  return reorderedCards
}
